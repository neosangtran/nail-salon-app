import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ─── Auth Stack ───────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
};

// ─── More Stack ───────────────────────────────────────────────────────────────

export type MoreStackParamList = {
  MoreMenu: undefined;
  Revenue: undefined;
  Supplies: undefined;
  GiftCerts: undefined;
  Commissions: undefined;
};

// ─── Staff Stack ──────────────────────────────────────────────────────────────

export type StaffStackParamList = {
  StaffList: undefined;
  StaffDetail: { staffId: string };
};

// ─── Customer Stack ───────────────────────────────────────────────────────────

export type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
};

// ─── App Tabs ─────────────────────────────────────────────────────────────────

export type AppTabsParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  Staff: { screen?: keyof StaffStackParamList; params?: StaffStackParamList[keyof StaffStackParamList] };
  Customers: { screen?: keyof CustomerStackParamList; params?: CustomerStackParamList[keyof CustomerStackParamList] };
  More: { screen?: keyof MoreStackParamList; params?: MoreStackParamList[keyof MoreStackParamList] };
};

// ─── Screen Props ─────────────────────────────────────────────────────────────

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export type StaffListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<StaffStackParamList, 'StaffList'>,
  BottomTabScreenProps<AppTabsParamList>
>;

export type StaffDetailScreenProps = NativeStackScreenProps<StaffStackParamList, 'StaffDetail'>;

export type CustomerListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<CustomerStackParamList, 'CustomerList'>,
  BottomTabScreenProps<AppTabsParamList>
>;

export type CustomerDetailScreenProps = NativeStackScreenProps<
  CustomerStackParamList,
  'CustomerDetail'
>;

export type MoreStackScreenProps<T extends keyof MoreStackParamList> = NativeStackScreenProps<
  MoreStackParamList,
  T
>;
