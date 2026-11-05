import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /supplies
export const getAllSupplies = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      category,
      lowStockOnly,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    // Note: SQLite via Prisma doesn't support column-to-column comparisons in `where`,
    // so lowStockOnly filtering is done in-memory after fetching. For large datasets a
    // raw query would be preferred; for typical salon inventory this is fine.
    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search };
    }

    if (category) {
      where.category = category;
    }

    // Fetch all matching rows first so we can filter low-stock in JS
    // (SQLite Prisma doesn't support field-to-field comparison in where)
    const allMatching = await prisma.supply.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const filtered =
      lowStockOnly === 'true'
        ? allMatching.filter((s) => s.quantity <= s.reorderLevel)
        : allMatching;

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: {
        supplies: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    console.error('[getAllSupplies]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /supplies/:id
export const getSupplyById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const supply = await prisma.supply.findUnique({ where: { id } });

    if (!supply) {
      res.status(404).json({ success: false, error: 'Supply not found' });
      return;
    }

    res.status(200).json({ success: true, data: { supply } });
  } catch (err) {
    console.error('[getSupplyById]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /supplies
export const createSupply = async (req: Request, res: Response): Promise<void> => {
  const { name, category, quantity, unit, reorderLevel, costPerUnit, supplier } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Name is required' });
    return;
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Category is required' });
    return;
  }

  if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
    res.status(400).json({ success: false, error: 'quantity must be a number' });
    return;
  }

  if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Unit is required' });
    return;
  }

  if (reorderLevel === undefined || reorderLevel === null || isNaN(Number(reorderLevel))) {
    res.status(400).json({ success: false, error: 'reorderLevel must be a number' });
    return;
  }

  if (costPerUnit === undefined || costPerUnit === null || isNaN(Number(costPerUnit))) {
    res.status(400).json({ success: false, error: 'costPerUnit must be a number' });
    return;
  }

  try {
    const supply = await prisma.supply.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        reorderLevel: Number(reorderLevel),
        costPerUnit: Number(costPerUnit),
        supplier: supplier ? String(supplier).trim() : null,
      },
    });

    res.status(201).json({ success: true, data: { supply } });
  } catch (err) {
    console.error('[createSupply]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PUT /supplies/:id
export const updateSupply = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, category, quantity, unit, reorderLevel, costPerUnit, supplier, lastRestocked } =
    req.body;

  try {
    const existing = await prisma.supply.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Supply not found' });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Name must be a non-empty string' });
        return;
      }
      updateData.name = name.trim();
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Category must be a non-empty string' });
        return;
      }
      updateData.category = category.trim();
    }

    if (quantity !== undefined) {
      if (isNaN(Number(quantity))) {
        res.status(400).json({ success: false, error: 'quantity must be a number' });
        return;
      }
      updateData.quantity = Number(quantity);
    }

    if (unit !== undefined) {
      if (typeof unit !== 'string' || unit.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Unit must be a non-empty string' });
        return;
      }
      updateData.unit = unit.trim();
    }

    if (reorderLevel !== undefined) {
      if (isNaN(Number(reorderLevel))) {
        res.status(400).json({ success: false, error: 'reorderLevel must be a number' });
        return;
      }
      updateData.reorderLevel = Number(reorderLevel);
    }

    if (costPerUnit !== undefined) {
      if (isNaN(Number(costPerUnit))) {
        res.status(400).json({ success: false, error: 'costPerUnit must be a number' });
        return;
      }
      updateData.costPerUnit = Number(costPerUnit);
    }

    if (supplier !== undefined) {
      updateData.supplier = supplier === null ? null : String(supplier).trim();
    }

    if (lastRestocked !== undefined) {
      const parsed = new Date(lastRestocked);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ success: false, error: 'lastRestocked must be a valid date' });
        return;
      }
      updateData.lastRestocked = parsed;
    }

    const supply = await prisma.supply.update({ where: { id }, data: updateData });

    res.status(200).json({ success: true, data: { supply } });
  } catch (err) {
    console.error('[updateSupply]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /supplies/:id
export const deleteSupply = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const existing = await prisma.supply.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Supply not found' });
      return;
    }

    await prisma.supply.delete({ where: { id } });

    res.status(200).json({ success: true, data: { message: 'Supply deleted successfully' } });
  } catch (err) {
    console.error('[deleteSupply]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /supplies/:id/restock
export const restockSupply = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { quantity, costPerUnit, supplier } = req.body;

  if (quantity === undefined || quantity === null || isNaN(Number(quantity)) || Number(quantity) <= 0) {
    res.status(400).json({ success: false, error: 'quantity must be a positive number' });
    return;
  }

  try {
    const existing = await prisma.supply.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Supply not found' });
      return;
    }

    const updateData: Record<string, unknown> = {
      quantity: existing.quantity + Number(quantity),
      lastRestocked: new Date(),
    };

    if (costPerUnit !== undefined) {
      if (isNaN(Number(costPerUnit)) || Number(costPerUnit) < 0) {
        res.status(400).json({ success: false, error: 'costPerUnit must be a non-negative number' });
        return;
      }
      updateData.costPerUnit = Number(costPerUnit);
    }

    if (supplier !== undefined) {
      updateData.supplier = supplier === null ? null : String(supplier).trim();
    }

    const supply = await prisma.supply.update({ where: { id }, data: updateData });

    res.status(200).json({
      success: true,
      data: {
        supply,
        restocked: {
          addedQuantity: Number(quantity),
          previousQuantity: existing.quantity,
          newQuantity: supply.quantity,
        },
      },
    });
  } catch (err) {
    console.error('[restockSupply]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /supplies/low-stock
export const getLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const allSupplies = await prisma.supply.findMany({
      orderBy: { name: 'asc' },
    });

    // Filter: quantity <= reorderLevel
    const lowStock = allSupplies.filter((s) => s.quantity <= s.reorderLevel);

    // Sort by urgency ratio ascending (most critical = lowest ratio first)
    // ratio = quantity / reorderLevel; if reorderLevel is 0 treat ratio as 0 (most critical)
    lowStock.sort((a, b) => {
      const ratioA = a.reorderLevel > 0 ? a.quantity / a.reorderLevel : 0;
      const ratioB = b.reorderLevel > 0 ? b.quantity / b.reorderLevel : 0;
      return ratioA - ratioB;
    });

    // Attach estimated days until stockout based on lastRestocked and consumption rate.
    // Consumption rate is estimated as: quantity used since last restock / days since last restock.
    // If lastRestocked is unavailable or consumption rate can't be determined, estimatedDaysLeft is null.
    const alerts = lowStock.map((supply) => {
      let estimatedDaysLeft: number | null = null;

      if (supply.lastRestocked) {
        const daysSinceRestock =
          (Date.now() - supply.lastRestocked.getTime()) / (1000 * 60 * 60 * 24);

        // We don't have historical restock quantity stored, so we cannot compute an exact
        // consumption rate without additional data. We use the reorderLevel as a proxy:
        // assume a full restock brought it to reorderLevel * 2 (a reasonable heuristic),
        // and we're now at current quantity.
        const assumedRestockQuantity = supply.reorderLevel * 2;
        const consumed = assumedRestockQuantity - supply.quantity;

        if (consumed > 0 && daysSinceRestock > 0) {
          const dailyRate = consumed / daysSinceRestock;
          estimatedDaysLeft = dailyRate > 0 ? Math.floor(supply.quantity / dailyRate) : null;
        } else if (consumed <= 0) {
          // Quantity hasn't dropped below the assumed restock level — rate unknown
          estimatedDaysLeft = null;
        }
      }

      const urgencyRatio =
        supply.reorderLevel > 0 ? supply.quantity / supply.reorderLevel : 0;

      return {
        ...supply,
        urgencyRatio,
        estimatedDaysLeft,
        isOutOfStock: supply.quantity === 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
      },
    });
  } catch (err) {
    console.error('[getLowStockAlerts]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
