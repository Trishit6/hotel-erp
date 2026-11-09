import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import {
  calculateNights,
  dateAt,
  isIndianPhone,
  isIndianPin,
  type ActivityLog,
  type Attendance,
  type Department,
  type DashboardSummary,
  type Expense,
  type Guest,
  type HousekeepingTask,
  type InventoryItem,
  type Invoice,
  type Payment,
  type PaymentMethod,
  type PublicReservation,
  type PublicSettings,
  type Reservation,
  type ReservationStatus,
  type RestaurantMenuCategory,
  type RestaurantMenuItem,
  type RestaurantOrder,
  type Room,
  type RoomStatus,
  type RoomType,
  type StaffMember,
  type StaffRole,
  type SystemSettings,
  type UserRole,
  roleHome,
} from "./hotel-data";
import { ApiError, api } from "./api";

const reservationInputSchema = z.object({
  guestName: z.string().trim().min(2),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .refine(isIndianPhone, "Enter a valid Indian mobile number."),
  roomId: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(8),
  discount: z.number().min(0).max(100000).default(0),
  specialRequests: z.string().max(500).default(""),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  postalCode: z
    .string()
    .max(10)
    .optional()
    .refine(
      (value) => !value || isIndianPin(value),
      "Enter a valid 6-digit PIN code.",
    ),
});

const guestInputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .refine(isIndianPhone, "Enter a valid Indian mobile number."),
  address: z.string().default(""),
  preferences: z.string().default(""),
});

const expenseInputSchema = z.object({
  category: z.string().min(2),
  description: z.string().min(2),
  amount: z.number().positive(),
  method: z.enum(["cash", "upi", "card", "bank-transfer", "online"]),
  date: z.string(),
});

export type ReservationInput = z.infer<typeof reservationInputSchema>;
export type GuestInput = z.infer<typeof guestInputSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export type RoomTypeInput = {
  name: string;
  description: string;
  capacity: number;
  size: number;
  rate: number;
  image?: string;
  amenities?: string[];
};

export type InventoryInput = {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  supplier: string;
  purchasePrice: number;
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  staffId?: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface BusyRange {
  roomId: string;
  checkIn: string;
  checkOut: string;
}

export type StoreStatus = "loading" | "ready" | "error";

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

type MutationResult = { error?: string; redirect?: string };
type ReservationResult = { reservation?: PublicReservation; error?: string };
type GuestResult = { guest?: Guest; error?: string };

type PublicCatalogResponse = {
  roomTypes: RoomType[];
  rooms: Room[];
  busyRanges: BusyRange[];
  settings?: PublicSettings;
};

type BootstrapResponse = {
  user: SessionUser;
  roomTypes?: RoomType[];
  rooms?: Room[];
  reservations?: Reservation[];
  tasks?: HousekeepingTask[];
  staff?: StaffMember[];
  inventory?: InventoryItem[];
  orders?: RestaurantOrder[];
  menuCategories?: RestaurantMenuCategory[];
  menuItems?: RestaurantMenuItem[];
  guests?: Guest[];
  payments?: Payment[];
  invoices?: Invoice[];
  expenses?: Expense[];
  attendance?: Attendance[];
  activities?: ActivityLog[];
  users?: SessionUser[];
  settings?: SystemSettings;
};

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "pending",
  "confirmed",
  "checked-in",
];

const activeRanges = (reservations: Reservation[]): BusyRange[] =>
  reservations
    .filter((reservation) =>
      ACTIVE_RESERVATION_STATUSES.includes(reservation.status),
    )
    .map((reservation) => ({
      roomId: reservation.roomId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
    }));

export interface HotelStore {
  rooms: Room[];
  roomTypes: RoomType[];
  guests: Guest[];
  reservations: Reservation[];
  payments: Payment[];
  invoices: Invoice[];
  tasks: HousekeepingTask[];
  staff: StaffMember[];
  attendance: Attendance[];
  inventory: InventoryItem[];
  expenses: Expense[];
  orders: RestaurantOrder[];
  menuCategories: RestaurantMenuCategory[];
  menuItems: RestaurantMenuItem[];
  activities: ActivityLog[];
  users: SessionUser[];
  busyRanges: BusyRange[];
  settings: PublicSettings | null;
  systemSettings: SystemSettings | null;
  dashboard: DashboardSummary | null;
  user: SessionUser | null;
  role: UserRole | null;
  actorName: string;
  status: StoreStatus;
  error: string | null;
  clearError: () => void;
  login: (email: string, password: string) => Promise<MutationResult>;
  register: (input: RegisterInput) => Promise<MutationResult>;
  logout: () => Promise<void>;
  can: (allowed: StaffRole[]) => boolean;
  refresh: () => Promise<void>;
  getRoom: (id: string) => Room | undefined;
  getRoomType: (id: string) => RoomType | undefined;
  getGuest: (id: string) => Guest | undefined;
  getReservation: (id: string) => Reservation | undefined;
  isRoomAvailable: (
    roomId: string,
    checkIn: string,
    checkOut: string,
  ) => boolean;
  getAvailableRooms: (
    checkIn: string,
    checkOut: string,
    guests: number,
  ) => Room[];
  createReservation: (input: ReservationInput) => Promise<ReservationResult>;
  updateReservationStatus: (
    id: string,
    status: ReservationStatus,
  ) => Promise<MutationResult>;
  assignReservationRoom: (
    id: string,
    roomId: string,
  ) => Promise<MutationResult>;
  checkIn: (id: string) => Promise<MutationResult>;
  checkOut: (id: string) => Promise<MutationResult>;
  recordPayment: (
    reservationId: string,
    amount: number,
    method: PaymentMethod,
  ) => Promise<MutationResult>;
  updateRoomStatus: (id: string, status: RoomStatus) => Promise<MutationResult>;
  createRoom: (input: {
    number: string;
    typeId: string;
    floor: number;
    notes?: string;
  }) => Promise<MutationResult>;
  updateRoom: (
    id: string,
    input: { number?: string; typeId?: string; floor?: number; notes?: string },
  ) => Promise<MutationResult>;
  deleteRoom: (id: string) => Promise<MutationResult>;
  createRoomType: (input: RoomTypeInput) => Promise<MutationResult>;
  updateRoomType: (
    id: string,
    input: Partial<RoomTypeInput>,
  ) => Promise<MutationResult>;
  deleteRoomType: (id: string) => Promise<MutationResult>;
  createGuest: (input: GuestInput) => Promise<GuestResult>;
  updateGuest: (id: string, input: Partial<Guest>) => Promise<MutationResult>;
  deleteGuest: (id: string) => Promise<MutationResult>;
  updateTask: (
    id: string,
    update: Partial<HousekeepingTask>,
  ) => Promise<MutationResult>;
  createTask: (roomId: string) => Promise<MutationResult>;
  addStaff: (
    input: Omit<StaffMember, "id" | "joinedAt">,
  ) => Promise<MutationResult>;
  updateStaff: (
    id: string,
    input: Partial<Omit<StaffMember, "id" | "joinedAt">>,
  ) => Promise<MutationResult>;
  updateAttendance: (
    id: string,
    status: Attendance["status"],
  ) => Promise<MutationResult>;
  createAttendance: (
    staffId: string,
    input: Pick<Attendance, "date" | "status" | "clockIn" | "clockOut">,
  ) => Promise<MutationResult>;
  addExpense: (input: ExpenseInput) => Promise<MutationResult>;
  updateExpense: (id: string, input: Partial<ExpenseInput>) => Promise<MutationResult>;
  deleteExpense: (id: string) => Promise<MutationResult>;
  approveExpense: (
    id: string,
    status: Expense["status"],
  ) => Promise<MutationResult>;
  adjustInventory: (id: string, amount: number) => Promise<MutationResult>;
  createInventory: (input: InventoryInput) => Promise<MutationResult>;
  updateInventory: (
    id: string,
    input: Partial<InventoryInput>,
  ) => Promise<MutationResult>;
  deleteInventory: (id: string) => Promise<MutationResult>;
  addOrder: (
    input: Omit<RestaurantOrder, "id" | "createdAt" | "status">,
  ) => Promise<MutationResult>;
  updateOrder: (
    id: string,
    status: RestaurantOrder["status"],
  ) => Promise<MutationResult>;
  createUser: (input: {
    name: string;
    email: string;
    password: string;
    role: StaffRole;
  }) => Promise<MutationResult>;
  updateUser: (
    id: string,
    input: { role?: StaffRole; isActive?: boolean },
  ) => Promise<MutationResult>;
  updateSettings: (
    input: Partial<Omit<SystemSettings, "id" | "address" | "taxRatePercent" | "updatedAt">>,
  ) => Promise<MutationResult>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<MutationResult>;
  refreshDemoData: () => Promise<MutationResult>;
}

const StoreContext = createContext<HotelStore | null>(null);

export function HotelProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [menuCategories, setMenuCategories] = useState<RestaurantMenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [busyRanges, setBusyRanges] = useState<BusyRange[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(
    null,
  );
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [actorName, setActorName] = useState("RIVR team");
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadPublicData = async () => {
    const catalog = await api.get<PublicCatalogResponse>("/public/catalog");
    setRoomTypes(catalog.roomTypes);
    setRooms(catalog.rooms);
    setBusyRanges(catalog.busyRanges);
    if (catalog.settings) setSettings(catalog.settings);
  };

  const loadAdminData = async (withDashboard = true) => {
    const [bootstrap, dashboardSummary] = await Promise.all([
      api.get<BootstrapResponse>("/admin/bootstrap"),
      // The general staff role holds no dashboard:read permission; requesting
      // the financial summary would fail the whole workspace load.
      withDashboard
        ? api.get<DashboardSummary>("/admin/reports/dashboard")
        : Promise.resolve(null),
    ]);
    setRoomTypes(bootstrap.roomTypes ?? []);
    setRooms(bootstrap.rooms ?? []);
    setReservations(bootstrap.reservations ?? []);
    setTasks(bootstrap.tasks ?? []);
    setStaff(bootstrap.staff ?? []);
    setInventory(bootstrap.inventory ?? []);
    setOrders(bootstrap.orders ?? []);
    setMenuCategories(bootstrap.menuCategories ?? []);
    setMenuItems(bootstrap.menuItems ?? []);
    setGuests(bootstrap.guests ?? []);
    setPayments(bootstrap.payments ?? []);
    setInvoices(bootstrap.invoices ?? []);
    setExpenses(bootstrap.expenses ?? []);
    setAttendance(bootstrap.attendance ?? []);
    setActivities(bootstrap.activities ?? []);
    setUsers(bootstrap.users ?? []);
    setBusyRanges(activeRanges(bootstrap.reservations ?? []));
    setDashboard(dashboardSummary);
    if (bootstrap.settings) {
      setSystemSettings(bootstrap.settings);
      setSettings(bootstrap.settings);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialise = async () => {
      try {
        await loadPublicData();
        let session: SessionUser | null = null;
        try {
          const result = await api.get<{ user: SessionUser }>("/auth/me");
          session = result.user;
        } catch (sessionError) {
          if (
            !(sessionError instanceof ApiError) ||
            sessionError.status !== 401
          )
            throw sessionError;
        }
        if (cancelled) return;
        if (session) {
          setUser(session);
          setRole(session.role);
          setActorName(session.name);
          // Customers have no staff workspace; loading it would leak other
          // guests' records through the bootstrap query.
          if (session.role !== "customer")
            await loadAdminData(session.role !== "staff");
        }
        if (!cancelled) setStatus("ready");
      } catch (initialError) {
        if (cancelled) return;
        setError(
          initialError instanceof Error
            ? initialError.message
            : "The hotel data could not be loaded.",
        );
        setStatus("error");
      }
    };

    void initialise();
    return () => {
      cancelled = true;
    };
    // The API client is stable for the lifetime of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<HotelStore>(() => {
    const getRoom = (id: string) => rooms.find((room) => room.id === id);
    const getRoomType = (id: string) =>
      roomTypes.find((type) => type.id === id);
    const getGuest = (id: string) => guests.find((guest) => guest.id === id);
    const getReservation = (id: string) =>
      reservations.find(
        (reservation) => reservation.id === id || reservation.reference === id,
      );

    const handleError = (
      caught: unknown,
      sessionExpiry = true,
    ): MutationResult => {
      const message =
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.";
      if (
        sessionExpiry &&
        caught instanceof ApiError &&
        caught.status === 401
      ) {
        setUser(null);
        setRole(null);
        setActorName("RIVR team");
        setError("Your session expired. Please sign in again.");
      } else {
        setError(message);
      }
      return { error: message };
    };

    const refresh = async () => {
      try {
        if (user) await loadAdminData(role !== "staff");
        else await loadPublicData();
        setStatus("ready");
      } catch (caught) {
        handleError(caught);
      }
    };

    const isRoomAvailable = (
      roomId: string,
      checkIn: string,
      checkOut: string,
    ) => {
      const room = getRoom(roomId);
      if (
        !room ||
        ["maintenance", "out-of-order", "cleaning"].includes(room.status)
      )
        return false;
      return !busyRanges.some(
        (range) =>
          range.roomId === roomId &&
          range.checkIn < checkOut &&
          range.checkOut > checkIn,
      );
    };

    const getAvailableRooms = (
      checkIn: string,
      checkOut: string,
      party: number,
    ) =>
      rooms.filter((room) => {
        const type = getRoomType(room.typeId);
        return Boolean(
          type &&
            type.capacity >= party &&
            isRoomAvailable(room.id, checkIn, checkOut),
        );
      });

    const applySessionUser = (sessionUser: SessionUser) => {
      setUser(sessionUser);
      setRole(sessionUser.role);
      setActorName(sessionUser.name);
    };

    const finishSignIn = async (
      withDashboard = true,
    ): Promise<MutationResult> => {
      setError(null);
      setStatus("ready");
      try {
        await loadAdminData(withDashboard);
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const login = async (
      email: string,
      password: string,
    ): Promise<MutationResult> => {
      try {
        const result = await api.post<{
          user: SessionUser;
          redirect?: string;
        }>("/auth/login", { email, password });
        applySessionUser(result.user);
        const redirect = result.redirect ?? roleHome(result.user.role);
        if (result.user.role === "customer") {
          setError(null);
          setStatus("ready");
          return { redirect };
        }
        return {
          ...(await finishSignIn(result.user.role !== "staff")),
          redirect,
        };
      } catch (caught) {
        setUser(null);
        setRole(null);
        setActorName("RIVR team");
        const message =
          caught instanceof ApiError
            ? caught.message
            : "Sign in failed. Please try again.";
        setError(message);
        return { error: message };
      }
    };

    const register = async (
      input: RegisterInput,
    ): Promise<MutationResult> => {
      try {
        const result = await api.post<{
          user: SessionUser;
          redirect?: string;
        }>("/auth/register", input);
        applySessionUser(result.user);
        setError(null);
        setStatus("ready");
        return { redirect: result.redirect ?? roleHome(result.user.role) };
      } catch (caught) {
        const message =
          caught instanceof ApiError
            ? caught.message
            : "Account creation failed. Please try again.";
        setError(message);
        return { error: message };
      }
    };

    const logout = async () => {
      try {
        await api.post("/auth/logout");
      } catch {
        // Clearing the local session is still the correct outcome.
      }
      setUser(null);
      setRole(null);
      setActorName("RIVR team");
      setReservations([]);
      setGuests([]);
      setPayments([]);
      setInvoices([]);
      setTasks([]);
      setStaff([]);
      setAttendance([]);
      setInventory([]);
      setExpenses([]);
      setOrders([]);
      setMenuCategories([]);
      setMenuItems([]);
      setActivities([]);
      setUsers([]);
      try {
        await loadPublicData();
        setStatus("ready");
      } catch (caught) {
        handleError(caught);
      }
    };

    const createReservation = async (
      input: ReservationInput,
    ): Promise<ReservationResult> => {
      const parsed = reservationInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          error:
            parsed.error.issues[0]?.message ??
            "Please check the reservation details.",
        };
      }
      const data = parsed.data;
      const type = getRoomType(getRoom(data.roomId)?.typeId ?? "");
      const nights = calculateNights(data.checkIn, data.checkOut);
      if (!type || nights < 1)
        return { error: "Choose a valid stay range and room." };
      if (data.adults + data.children > type.capacity) {
        return { error: "This room does not fit the selected guests." };
      }
      if (!isRoomAvailable(data.roomId, data.checkIn, data.checkOut)) {
        return { error: "That room is no longer available for these dates." };
      }

      try {
        const body = {
          guestName: data.guestName,
          email: data.email,
          phone: data.phone,
          roomId: data.roomId,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          adults: data.adults,
          children: data.children,
          specialRequests: data.specialRequests,
          address: data.address ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          postalCode: data.postalCode ?? "",
          ...(role && role !== "customer" ? { discount: data.discount } : {}),
        };
        const result = await api.post<{
          reservation: PublicReservation | Reservation;
        }>(
          role && role !== "customer"
            ? "/admin/reservations"
            : "/public/reservations",
          body,
        );
        await refresh();
        const created = result.reservation;
        // Public creation already returns the allowlisted view. Staff creation
        // returns the internal reservation, so build the same immediate view
        // from the catalog data the form is already displaying.
        return {
          reservation:
            "guestFirstName" in created
              ? created
              : {
                  reference: created.reference,
                  status: created.status,
                  checkIn: created.checkIn,
                  checkOut: created.checkOut,
                  roomTypeName: type.name,
                  roomNumber: getRoom(data.roomId)?.number ?? "",
                  guestFirstName: data.guestName.trim().split(/\s+/)[0] ?? "",
                  total: created.total,
                  paidAmount: created.paidAmount,
                  paymentStatus: created.paymentStatus,
                },
        };
      } catch (caught) {
        return handleError(caught, false);
      }
    };

    const checkIn = async (id: string): Promise<MutationResult> => {
      try {
        await api.post(`/admin/reservations/${id}/check-in`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const checkOut = async (id: string): Promise<MutationResult> => {
      try {
        await api.post(`/admin/reservations/${id}/check-out`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateReservationStatus = async (
      id: string,
      nextStatus: ReservationStatus,
    ): Promise<MutationResult> => {
      if (nextStatus === "checked-in") return checkIn(id);
      if (nextStatus === "checked-out") return checkOut(id);
      try {
        await api.patch(`/admin/reservations/${id}/status`, {
          status: nextStatus,
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const assignReservationRoom = async (
      id: string,
      roomId: string,
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/reservations/${id}/room`, { roomId });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const recordPayment = async (
      reservationId: string,
      amount: number,
      method: PaymentMethod,
    ): Promise<MutationResult> => {
      try {
        await api.post("/admin/payments", {
          reservationId,
          amount,
          method,
          note: "Recorded by front desk",
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateRoomStatus = async (
      id: string,
      nextStatus: RoomStatus,
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/rooms/${id}/status`, { status: nextStatus });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createRoom = async (input: {
      number: string;
      typeId: string;
      floor: number;
      notes?: string;
    }): Promise<MutationResult> => {
      try {
        await api.post("/admin/rooms", {
          ...input,
          notes: input.notes ?? "",
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateRoom = async (
      id: string,
      input: { number?: string; typeId?: string; floor?: number; notes?: string },
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/rooms/${id}`, input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const deleteRoom = async (id: string): Promise<MutationResult> => {
      try {
        await api.delete(`/admin/rooms/${id}`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createRoomType = async (
      input: RoomTypeInput,
    ): Promise<MutationResult> => {
      try {
        await api.post("/admin/rooms/types", input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateRoomType = async (
      id: string,
      input: Partial<RoomTypeInput>,
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/rooms/types/${id}`, input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const deleteRoomType = async (id: string): Promise<MutationResult> => {
      try {
        await api.delete(`/admin/rooms/types/${id}`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createGuest = async (input: GuestInput): Promise<GuestResult> => {
      const parsed = guestInputSchema.safeParse(input);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message };
      try {
        const result = await api.post<{ guest: Guest }>(
          "/admin/guests",
          parsed.data,
        );
        await refresh();
        return { guest: result.guest };
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateGuest = async (
      id: string,
      input: Partial<Guest>,
    ): Promise<MutationResult> => {
      try {
        const body: Record<string, unknown> = {};
        for (const key of [
          "name",
          "email",
          "phone",
          "address",
          "city",
          "state",
          "postalCode",
          "idType",
          "idLastFour",
          "preferences",
        ] as const) {
          if (key in input && input[key] !== undefined) body[key] = input[key];
        }
        await api.patch(`/admin/guests/${id}`, body);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const deleteGuest = async (id: string): Promise<MutationResult> => {
      try {
        await api.delete(`/admin/guests/${id}`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateTask = async (
      id: string,
      update: Partial<HousekeepingTask>,
    ): Promise<MutationResult> => {
      try {
        const body: Record<string, unknown> = {};
        if ("assignedTo" in update) body.assignedTo = update.assignedTo ?? null;
        if (update.status) body.status = update.status;
        if (update.priority) body.priority = update.priority;
        if (update.issue !== undefined) body.issue = update.issue;
        await api.patch(`/admin/housekeeping/tasks/${id}`, body);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createTask = async (roomId: string): Promise<MutationResult> => {
      try {
        await api.post("/admin/housekeeping/tasks", {
          roomId,
          priority: "normal",
          issue: "New cleaning task",
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const addStaff = async (
      input: Omit<StaffMember, "id" | "joinedAt">,
    ): Promise<MutationResult> => {
      try {
        await api.post("/admin/staff", { ...input, joinedAt: dateAt(0) });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateStaff = async (
      id: string,
      input: Partial<Omit<StaffMember, "id" | "joinedAt">>,
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/staff/${id}`, input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateAttendance = async (
      id: string,
      nextStatus: Attendance["status"],
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/staff/attendance/${id}`, {
          status: nextStatus,
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createAttendance = async (
      staffId: string,
      input: Pick<Attendance, "date" | "status" | "clockIn" | "clockOut">,
    ): Promise<MutationResult> => {
      try {
        await api.post(`/admin/staff/${staffId}/attendance`, {
          date: input.date,
          status: input.status,
          clockIn: input.clockIn ?? null,
          clockOut: input.clockOut ?? null,
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const addExpense = async (input: ExpenseInput): Promise<MutationResult> => {
      const parsed = expenseInputSchema.safeParse(input);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message };
      try {
        await api.post("/admin/expenses", parsed.data);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const approveExpense = async (
      id: string,
      nextStatus: Expense["status"],
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/expenses/${id}/approval`, {
          status: nextStatus,
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateExpense = async (
      id: string,
      input: Partial<ExpenseInput>,
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/expenses/${id}`, input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const deleteExpense = async (id: string): Promise<MutationResult> => {
      try {
        await api.delete(`/admin/expenses/${id}`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const adjustInventory = async (
      id: string,
      amount: number,
    ): Promise<MutationResult> => {
      try {
        await api.post(`/admin/inventory/${id}/adjust`, { amount });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createInventory = async (
      input: InventoryInput,
    ): Promise<MutationResult> => {
      try {
        await api.post("/admin/inventory", input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateInventory = async (
      id: string,
      input: Partial<InventoryInput>,
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/inventory/${id}`, input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const deleteInventory = async (id: string): Promise<MutationResult> => {
      try {
        await api.delete(`/admin/inventory/${id}`);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const addOrder = async (
      input: Omit<RestaurantOrder, "id" | "createdAt" | "status">,
    ): Promise<MutationResult> => {
      try {
        await api.post("/admin/restaurant/orders", {
          guestName: input.guestName,
          items: input.items,
          amount: input.amount,
          roomNumber: input.roomNumber ?? "",
          reservationId: input.reservationId ?? null,
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateOrder = async (
      id: string,
      nextStatus: RestaurantOrder["status"],
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/restaurant/orders/${id}/status`, {
          status: nextStatus,
        });
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const createUser = async (input: {
      name: string;
      email: string;
      password: string;
      role: StaffRole;
    }): Promise<MutationResult> => {
      try {
        await api.post("/admin/users", input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateUser = async (
      id: string,
      input: { role?: StaffRole; isActive?: boolean },
    ): Promise<MutationResult> => {
      try {
        await api.patch(`/admin/users/${id}`, input);
        await refresh();
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const updateSettings = async (
      input: Partial<
        Omit<SystemSettings, "id" | "address" | "taxRatePercent" | "updatedAt">
      >,
    ): Promise<MutationResult> => {
      try {
        const result = await api.patch<{ settings: SystemSettings }>(
          "/admin/settings",
          input,
        );
        setSystemSettings(result.settings);
        setSettings(result.settings);
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    const changePassword = async (
      currentPassword: string,
      newPassword: string,
    ): Promise<MutationResult> => {
      try {
        await api.post("/auth/change-password", {
          currentPassword,
          newPassword,
        });
        return {};
      } catch (caught) {
        return handleError(caught, false);
      }
    };

    const refreshDemoData = async (): Promise<MutationResult> => {
      try {
        await api.post("/admin/dev/reset");
      } catch (caught) {
        return handleError(caught);
      }
      setUser(null);
      setRole(null);
      setActorName("RIVR team");
      setReservations([]);
      setGuests([]);
      setPayments([]);
      setInvoices([]);
      setTasks([]);
      setStaff([]);
      setAttendance([]);
      setInventory([]);
      setExpenses([]);
      setOrders([]);
      setMenuCategories([]);
      setMenuItems([]);
      setActivities([]);
      setUsers([]);
      try {
        await loadPublicData();
        setStatus("ready");
        return {};
      } catch (caught) {
        return handleError(caught);
      }
    };

    return {
      rooms,
      roomTypes,
      guests,
      reservations,
      payments,
      invoices,
      tasks,
      staff,
      attendance,
      inventory,
      expenses,
      orders,
      menuCategories,
      menuItems,
      activities,
      users,
      busyRanges,
      settings,
      systemSettings,
      dashboard,
      user,
      role,
      actorName,
      status,
      error,
      clearError: () => setError(null),
      login,
      register,
      logout,
      can: (allowed: StaffRole[]) =>
        Boolean(role && (allowed as readonly string[]).includes(role)),
      refresh,
      getRoom,
      getRoomType,
      getGuest,
      getReservation,
      isRoomAvailable,
      getAvailableRooms,
      createReservation,
      updateReservationStatus,
      assignReservationRoom,
      checkIn,
      checkOut,
      recordPayment,
      updateRoomStatus,
      createRoom,
      updateRoom,
      deleteRoom,
      createRoomType,
      updateRoomType,
      deleteRoomType,
      createGuest,
      updateGuest,
      deleteGuest,
      updateTask,
      createTask,
      addStaff,
      updateStaff,
      updateAttendance,
      createAttendance,
      addExpense,
      updateExpense,
      deleteExpense,
      approveExpense,
      adjustInventory,
      createInventory,
      updateInventory,
      deleteInventory,
      addOrder,
      updateOrder,
      createUser,
      updateUser,
      updateSettings,
      changePassword,
      refreshDemoData,
    };
  }, [
    activities,
    actorName,
    attendance,
    busyRanges,
    dashboard,
    error,
    expenses,
    guests,
    inventory,
    invoices,
    menuCategories,
    menuItems,
    orders,
    payments,
    reservations,
    role,
    rooms,
    roomTypes,
    settings,
    staff,
    status,
    systemSettings,
    tasks,
    user,
    users,
  ]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useHotel() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useHotel must be used inside HotelProvider");
  return context;
}
