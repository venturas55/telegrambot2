import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import {
  activateSubscription,
  ApiError,
  getPaymentsDashboard,
  getSession,
  getUserPayments,
  getUsers,
  login,
  logout,
  paySubscription,
  removeUser,
  revokeSubscription,
  updateExpiration
} from "./src/api";

function formatDate(value) {
  if (!value) return "Sin fecha de expiración";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("es-ES", {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("es-ES", {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

function ActionButton({
  label,
  onPress,
  variant = "secondary",
  disabled,
  compact = false,
  large = false
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        compact && styles.compactActionButton,
        large && styles.largeActionButton,
        variant === "primary" && styles.primaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabledButton
      ]}
    >
      <Text
        style={[
          styles.actionText,
          compact && styles.compactActionText,
          large && styles.largeActionText,
          variant === "primary" && styles.lightActionText,
          variant === "danger" && styles.dangerActionText
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MenuItem({ label, hint, icon, destructive = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed
      ]}
    >
      <View style={[styles.menuIcon, destructive && styles.menuIconDanger]}>
        <Text style={[styles.menuIconText, destructive && styles.menuIconDangerText]}>
          {icon}
        </Text>
      </View>
      <View style={styles.menuItemText}>
        <Text style={[styles.menuItemLabel, destructive && styles.menuItemDanger]}>
          {label}
        </Text>
        <Text style={styles.menuItemHint}>{hint}</Text>
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

function ScreenHeader({ title, eyebrow = "DETALLE", onBack, tablet = false }) {
  return (
    <View style={styles.screenHeader}>
      <View
        style={[
          styles.screenHeaderInner,
          tablet && styles.tabletScreenHeaderInner
        ]}
      >
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.menuButtonPressed
          ]}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <View style={styles.screenHeaderText}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text numberOfLines={1} style={styles.screenTitle}>
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

function UserCard({
  user,
  busy,
  tablet = false,
  onActivate,
  onRevoke,
  onPay,
  onRemove,
  onEditExpiration,
  onOpenPayments
}) {
  const isActive = user.estado === "activo";
  const hasAccess = Boolean(user.has_access);
  const displayName = user.username || user.nombre || "Usuario sin nombre";

  return (
    <View style={[styles.userCard, tablet && styles.tabletUserCard]}>
      <Pressable
        accessibilityHint="Abre los pagos y las peticiones del usuario"
        accessibilityRole="button"
        onPress={() => onOpenPayments(user)}
      >
        <View style={styles.userCardHeading}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {displayName.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.telegramId}>Telegram ID: {user.telegram_id}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              hasAccess ? styles.activeBadge : styles.inactiveBadge
            ]}
          >
            <Text
              style={[
                styles.statusText,
                hasAccess ? styles.activeText : styles.inactiveText
              ]}
            >
              {isActive ? "Activo" : "Inactivo"}
            </Text>
          </View>
        </View>

        <View style={styles.userExpiryBlock}>
          <Text style={styles.userExpiryLabel}>Hasta</Text>
          <Text style={styles.expiryValue}>{formatDate(user.end_date)}</Text>
          <Text style={styles.detailsLink}>Ver historial</Text>
        </View>
      </Pressable>

      <View style={styles.userActions}>
        {user.subscripcion_id != null && (
          <>
            <ActionButton
              label={isActive ? "Revocar" : "Activar"}
              variant={isActive ? "danger" : "primary"}
              disabled={busy}
              compact
              onPress={() =>
                isActive ? onRevoke(user) : onActivate(user)
              }
            />
            <ActionButton
              label="Pago"
              disabled={busy}
              compact
              onPress={() => onPay(user)}
            />
            <ActionButton
              label="Fecha"
              disabled={busy}
              compact
              onPress={() => onEditExpiration(user)}
            />
          </>
        )}
        <ActionButton
          label="Eliminar"
          variant="danger"
          disabled={busy}
          compact
          onPress={() => onRemove(user)}
        />
      </View>
    </View>
  );
}

function UserPaymentsScreen({
  selectedUser,
  userPayments,
  loading,
  error,
  onBack,
  onRetry
}) {
  const user = userPayments?.usuario || selectedUser;
  const payments = userPayments?.pagos || [];
  const requests = userPayments?.peticiones || [];
  const isTablet = useWindowDimensions().width >= 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />
      <ScreenHeader
        title="Historial del usuario"
        onBack={onBack}
        tablet={isTablet}
      />
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.tabletListContent
        ]}
        data={[]}
        ListHeaderComponent={
          <View>
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {(user?.username || user?.nombre || "U").trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text numberOfLines={1} style={styles.profileName}>
                  {user?.username || user?.nombre || "Usuario"}
                </Text>
                <Text style={styles.profileTelegram}>Telegram ID: {user?.telegram_id}</Text>
                {user?.fecha_alta ? (
                  <Text style={styles.detailMeta}>
                    Alta: {formatDateTime(user.fecha_alta)}
                  </Text>
                ) : null}
              </View>
            </View>

            {loading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator color="#2563eb" size="small" />
                <Text style={styles.loadingText}>Cargando historial...</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
                <ActionButton label="Reintentar" onPress={onRetry} />
              </View>
            ) : null}

            {!loading && userPayments ? (
              <View style={isTablet && styles.historyColumns}>
                <View style={isTablet && styles.historyColumn}>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Pagos</Text>
                    <Text style={styles.sectionCount}>{payments.length}</Text>
                  </View>
                  {payments.length ? (
                    payments.map((payment) => (
                      <View key={payment.id} style={styles.historyCard}>
                        <Text style={styles.historyPrimary}>
                          {payment.precio} €
                        </Text>
                        <Text style={styles.historySecondary}>
                          {formatDateTime(payment.fecha_pago)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No hay pagos registrados.</Text>
                  )}
                </View>
                <View style={isTablet && styles.historyColumn}>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Peticiones</Text>
                    <Text style={styles.sectionCount}>{requests.length}</Text>
                  </View>
                  {requests.length ? (
                    requests.map((request, index) => (
                      <View
                        key={request.id ?? `${request.fecha}-${index}`}
                        style={styles.historyCard}
                      >
                        <Text style={styles.historyPrimary}>
                          {request.peticion}
                        </Text>
                        <Text style={styles.historySecondary}>
                          {formatDateTime(request.fecha)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      No hay peticiones registradas.
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function AllRequestsScreen({ requests, loading, error, onBack, onRetry }) {
  const isTablet = useWindowDimensions().width >= 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />
      <ScreenHeader
        title="Peticiones"
        eyebrow="ACTIVIDAD"
        onBack={onBack}
        tablet={isTablet}
      />
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.tabletListContent
        ]}
        data={requests}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? "tablet-requests" : "phone-requests"}
        columnWrapperStyle={isTablet ? styles.tabletColumnWrapper : undefined}
        keyExtractor={(request) => String(request.id)}
        ListEmptyComponent={
          loading || error ? null : (
            <Text style={styles.emptyText}>No hay peticiones registradas.</Text>
          )
        }
        ListHeaderComponent={
          <View>
            <View style={styles.requestsSummary}>
              <View style={styles.requestsSummaryMark}>
                <Text style={styles.requestsSummaryMarkText}>P</Text>
              </View>
              <View style={styles.requestsSummaryText}>
                <Text style={styles.requestsSummaryTitle}>Todas las peticiones</Text>
                <Text style={styles.requestsSummaryHint}>
                  Actividad registrada por los usuarios
                </Text>
              </View>
              <Text style={styles.sectionCount}>{requests.length}</Text>
            </View>
            {loading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator color="#2563eb" size="small" />
                <Text style={styles.loadingText}>Cargando peticiones...</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
                <ActionButton label="Reintentar" onPress={onRetry} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.requestCard, isTablet && styles.tabletRequestCard]}>
            <View style={styles.requestCardTop}>
              <View style={styles.requestBullet} />
              <Text style={styles.historyPrimary}>{item.peticion}</Text>
            </View>
            <Text numberOfLines={1} style={styles.requestUser}>
              {item.username || item.nombre || "Usuario"} - Telegram ID: {item.telegram_id}
            </Text>
            <Text style={styles.historySecondary}>
              {formatDateTime(item.fecha)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function LoginScreen({ onLogin, busy, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.loginWrapper}
    >
      <View style={styles.loginCard}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>A</Text>
        </View>
        <Text style={styles.loginEyebrow}>ACCESO SEGURO</Text>
        <Text style={styles.loginTitle}>Panel de administración</Text>
        <Text style={styles.loginSubtitle}>Gestión de usuarios</Text>

        <Text style={styles.inputLabel}>Usuario</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          keyboardType="email-address"
          onChangeText={setUsername}
          placeholder="Tu usuario"
          placeholderTextColor="#91a0b2"
          style={styles.input}
          value={username}
        />

        <Text style={styles.inputLabel}>Contraseña</Text>
        <TextInput
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={() => onLogin(username, password)}
          placeholder="Tu contraseña"
          placeholderTextColor="#91a0b2"
          returnKeyType="go"
          secureTextEntry
          style={[styles.input, styles.loginInput]}
          value={password}
        />

        {error ? (
          <View style={styles.loginError}>
            <Text style={styles.loginErrorText}>{error}</Text>
          </View>
        ) : null}
        <ActionButton
          label={busy ? "Entrando..." : "Iniciar sesión"}
          variant="primary"
          large
          compact={false}
          disabled={busy || !username.trim() || !password}
          onPress={() => onLogin(username, password)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function App() {
  const isTablet = useWindowDimensions().width >= 768;
  const [users, setUsers] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [expirationInput, setExpirationInput] = useState("");
  const [expirationError, setExpirationError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPayments, setUserPayments] = useState(null);
  const [loadingUserPayments, setLoadingUserPayments] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [loadingAllRequests, setLoadingAllRequests] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const refreshUsers = useCallback(async () => {
    try {
      const result = await getUsers();
      setUsers(Array.isArray(result) ? result : []);
      setAuthenticated(true);
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthenticated(false);
      }
      throw cause;
    }
  }, []);

  useEffect(() => {
    getSession()
      .then(({ authenticated: hasSession }) => {
        if (hasSession) {
          return refreshUsers();
        }
      })
      .catch((cause) => {
        setError(cause.message);
      })
      .finally(() => setCheckingSession(false));
  }, [refreshUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return users;
    return users.filter((user) =>
      [user.username, user.nombre, user.telegram_id]
        .filter((value) => value != null)
        .some((value) => String(value).toLocaleLowerCase("es").includes(query))
    );
  }, [search, users]);

  async function handleLogin(username, password) {
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      await refreshUsers();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function openUserPayments(user) {
    setSelectedUser(user);
    setUserPayments(null);
    setLoadingUserPayments(true);
    setError("");
    try {
      setUserPayments(await getUserPayments(user.telegram_id));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthenticated(false);
      }
      setError(cause.message);
    } finally {
      setLoadingUserPayments(false);
    }
  }

  function closeUserPayments() {
    setSelectedUser(null);
    setUserPayments(null);
    setError("");
  }

  async function openAllRequests() {
    setShowAllRequests(true);
    setLoadingAllRequests(true);
    setError("");
    try {
      const result = await getPaymentsDashboard();
      if (!Array.isArray(result.peticiones)) {
        throw new Error("La respuesta del servidor no contiene la lista de peticiones.");
      }
      setAllRequests(result.peticiones);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthenticated(false);
      }
      setError(cause.message);
    } finally {
      setLoadingAllRequests(false);
    }
  }

  function closeAllRequests() {
    setShowAllRequests(false);
    setError("");
  }

  function navigateToAllRequests() {
    setMenuVisible(false);
    openAllRequests();
  }

  function signOutFromMenu() {
    setMenuVisible(false);
    handleLogout();
  }

  async function runAction(user, action) {
    setBusyUserId(user.telegram_id);
    setError("");
    try {
      await action();
      await refreshUsers();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthenticated(false);
      }
      setError(cause.message);
    } finally {
      setBusyUserId(null);
    }
  }

  function confirmAction(title, message, onConfirm, destructive = false) {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        style: destructive ? "destructive" : "default",
        onPress: onConfirm
      }
    ]);
  }

  function handleLogout() {
    setBusy(true);
    logout()
      .catch((cause) => setError(cause.message))
      .finally(() => {
        setUsers([]);
        setAuthenticated(false);
        setBusy(false);
      });
  }

  async function saveExpiration() {
    const endDate = expirationInput.trim();
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endDate) ||
      Number.isNaN(new Date(endDate).getTime())
    ) {
      setExpirationError("Usa el formato AAAA-MM-DDTHH:mm.");
      return;
    }

    const user = editingUser;
    setBusyUserId(user.telegram_id);
    setExpirationError("");
    try {
      await updateExpiration(user.subscripcion_id, endDate);
      setEditingUser(null);
      await refreshUsers();
    } catch (cause) {
      setExpirationError(cause.message);
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthenticated(false);
      }
    } finally {
      setBusyUserId(null);
    }
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Conectando con el panel...</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />
        <LoginScreen onLogin={handleLogin} busy={busy} error={error} />
      </SafeAreaView>
    );
  }

  if (selectedUser) {
    return (
      <UserPaymentsScreen
        selectedUser={selectedUser}
        userPayments={userPayments}
        loading={loadingUserPayments}
        error={error}
        onBack={closeUserPayments}
        onRetry={() => openUserPayments(selectedUser)}
      />
    );
  }

  if (showAllRequests) {
    return (
      <AllRequestsScreen
        requests={allRequests}
        loading={loadingAllRequests}
        error={error}
        onBack={closeAllRequests}
        onRetry={openAllRequests}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />
      <View style={styles.header}>
        <View style={[styles.headerInner, isTablet && styles.tabletHeaderInner]}>
          <View style={styles.headerBrand}>
            <View style={styles.headerBrandMark}>
              <Text style={styles.headerBrandInitial}>A</Text>
            </View>
            <View style={styles.headerTitles}>
              <Text style={styles.eyebrow}>PANEL DE CONTROL</Text>
              <Text style={styles.title}>Usuarios</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Abrir menú"
            accessibilityRole="button"
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.menuButtonPressed
            ]}
          >
            <View style={styles.hamburger}>
              <View style={styles.hamburgerLine} />
              <View style={[styles.hamburgerLine, styles.hamburgerLineMiddle]} />
              <View style={styles.hamburgerLine} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={[styles.mainControls, isTablet && styles.tabletMainControls]}>
        <View style={styles.summary}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryLabel}>USUARIOS REGISTRADOS</Text>
          <View style={styles.summaryCountWrap}>
            <Text style={styles.summaryCount}>{users.length}</Text>
          </View>
        </View>

        <TextInput
          onChangeText={setSearch}
          placeholder="Buscar por usuario o Telegram ID"
          placeholderTextColor="#91a0b2"
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.tabletListContent
        ]}
        data={filteredUsers}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? "tablet-users" : "phone-users"}
        columnWrapperStyle={isTablet ? styles.tabletColumnWrapper : undefined}
        keyExtractor={(user, index) =>
          `${user.telegram_id}-${user.subscripcion_id || "sin-suscripcion"}-${index}`
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {search ? "No hay usuarios que coincidan." : "No hay usuarios."}
          </Text>
        }
        onRefresh={() =>
          refreshUsers().catch((cause) => setError(cause.message))
        }
        refreshing={busy}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            tablet={isTablet}
            busy={busyUserId === item.telegram_id}
            onActivate={(user) =>
              confirmAction(
                "Activar acceso",
                `¿Activar el acceso de ${user.username || user.telegram_id}?`,
                () => runAction(user, () => activateSubscription(user.subscripcion_id))
              )
            }
            onRevoke={(user) =>
              confirmAction(
                "Revocar acceso",
                `¿Revocar el acceso de ${user.username || user.telegram_id}?`,
                () => runAction(user, () => revokeSubscription(user.subscripcion_id)),
                true
              )
            }
            onPay={(user) =>
              confirmAction(
                "Registrar pago",
                `Se añadirá un pago y se ampliará un mes la suscripción de ${user.username || user.telegram_id}.`,
                () =>
                  runAction(user, () =>
                    paySubscription(user.telegram_id, user.subscripcion_id)
                  )
              )
            }
            onRemove={(user) =>
              confirmAction(
                "Eliminar usuario",
                `Se eliminarán ${user.username || user.telegram_id}, sus suscripciones y sus pagos. Esta acción no se puede deshacer.`,
                () => runAction(user, () => removeUser(user.telegram_id)),
                true
              )
            }
            onEditExpiration={(user) => {
              setExpirationInput(toDateTimeInput(user.end_date));
              setExpirationError("");
              setEditingUser(user);
            }}
            onOpenPayments={openUserPayments}
          />
        )}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setEditingUser(null)}
        transparent
        visible={editingUser !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeading}>
              <View style={styles.modalIcon}>
                <Text style={styles.modalIconText}>↻</Text>
              </View>
              <View style={styles.modalHeadingText}>
                <Text style={styles.modalEyebrow}>SUSCRIPCIÓN</Text>
                <Text style={styles.modalTitle}>Editar expiración</Text>
              </View>
            </View>
            <Text style={styles.modalHint}>
              Introduce la fecha y hora (AAAA-MM-DDTHH:mm).
            </Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setExpirationInput}
              placeholder="2026-12-31T23:59"
              placeholderTextColor="#91a0b2"
              style={styles.input}
              value={expirationInput}
            />
            {expirationError ? (
              <Text style={styles.errorText}>{expirationError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <ActionButton
                label="Cancelar"
                disabled={busyUserId !== null}
                onPress={() => setEditingUser(null)}
              />
              <ActionButton
                label={busyUserId === editingUser?.telegram_id ? "Guardando..." : "Guardar"}
                variant="primary"
                disabled={busyUserId !== null}
                onPress={saveExpiration}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        statusBarTranslucent
        transparent
        visible={menuVisible}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Cerrar menú"
            accessibilityRole="button"
            onPress={() => setMenuVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuEyebrow}>ADMINISTRACIÓN</Text>
                <Text style={styles.menuTitle}>Menú</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar menú"
                accessibilityRole="button"
                onPress={() => setMenuVisible(false)}
                style={styles.menuCloseButton}
              >
                <Text style={styles.menuCloseText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.menuDivider} />
            <MenuItem
              icon="P"
              label="Peticiones"
              hint="Historial de todos los usuarios"
              onPress={navigateToAllRequests}
            />
            <MenuItem
              icon="↪"
              label="Cerrar sesión"
              hint="Salir de la cuenta de administrador"
              destructive
              onPress={signOutFromMenu}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f6fb"
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f6fb"
  },
  loadingText: {
    color: "#64748b",
    marginTop: 12
  },
  loginWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 24
  },
  loginCard: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e7edf5",
    padding: 25,
    shadowColor: "#102a43",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#1d4ed8",
    marginBottom: 23
  },
  brandMarkText: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "800"
  },
  loginEyebrow: {
    color: "#2563eb",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 5
  },
  loginTitle: {
    color: "#132238",
    fontSize: 22,
    fontWeight: "800"
  },
  loginSubtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 5,
    marginBottom: 26
  },
  inputLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d9e2ee",
    borderRadius: 12,
    backgroundColor: "#fff",
    color: "#132238",
    fontSize: 15,
    paddingHorizontal: 13,
    marginBottom: 16
  },
  loginInput: {
    height: 50,
    borderRadius: 13,
    borderColor: "#dfe6ef",
    backgroundColor: "#fbfcfe"
  },
  errorText: {
    color: "#b42318",
    fontSize: 13,
    marginBottom: 14
  },
  loginError: {
    borderWidth: 1,
    borderColor: "#f3d4d1",
    borderRadius: 12,
    backgroundColor: "#fff5f4",
    padding: 11,
    marginBottom: 14
  },
  loginErrorText: {
    color: "#a12a24",
    fontSize: 13,
    lineHeight: 18
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 13,
    alignItems: "center"
  },
  headerInner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  tabletHeaderInner: {
    maxWidth: 1120,
    alignSelf: "center"
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  headerBrandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d4ed8",
    marginRight: 11
  },
  headerBrandInitial: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800"
  },
  headerTitles: {
    flex: 1
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e3e9f2",
    backgroundColor: "#fff",
    marginLeft: 12
  },
  menuButtonPressed: {
    backgroundColor: "#edf3fc"
  },
  hamburger: {
    width: 19,
    height: 15,
    justifyContent: "space-between"
  },
  hamburgerLine: {
    height: 2,
    width: 19,
    borderRadius: 2,
    backgroundColor: "#24364b"
  },
  hamburgerLineMiddle: {
    width: 14
  },
  screenHeader: {
    paddingTop: 13,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: "#f3f6fb"
  },
  screenHeaderInner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center"
  },
  tabletScreenHeaderInner: {
    maxWidth: 1120,
    alignSelf: "center"
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e3e9f2",
    backgroundColor: "#fff",
    marginRight: 12
  },
  backButtonText: {
    color: "#24364b",
    fontSize: 32,
    lineHeight: 34,
    marginTop: -3
  },
  screenHeaderText: {
    flex: 1
  },
  screenTitle: {
    color: "#132238",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 1
  },
  eyebrow: {
    color: "#7b8ba1",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.25
  },
  title: {
    color: "#132238",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 1
  },
  summary: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginBottom: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#eaf1fb"
  },
  mainControls: {
    width: "100%"
  },
  tabletMainControls: {
    maxWidth: 1120,
    alignSelf: "center"
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563eb",
    marginRight: 8
  },
  summaryCount: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  summaryLabel: {
    color: "#536780",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    flex: 1
  },
  summaryCountWrap: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#fff"
  },
  searchInput: {
    height: 46,
    marginHorizontal: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 13,
    backgroundColor: "#fff",
    color: "#132238",
    fontSize: 14,
    paddingHorizontal: 14,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 28
  },
  tabletListContent: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 24
  },
  tabletColumnWrapper: {
    justifyContent: "space-between"
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    padding: 11,
    marginBottom: 8,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1
  },
  tabletUserCard: {
    width: "48.5%"
  },
  userCardHeading: {
    flexDirection: "row",
    alignItems: "center"
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf1ff",
    marginRight: 9
  },
  userAvatarText: {
    color: "#2456b3",
    fontWeight: "800",
    fontSize: 15
  },
  userInfo: {
    flex: 1
  },
  userName: {
    color: "#132238",
    fontWeight: "700",
    fontSize: 15
  },
  telegramId: {
    color: "#748399",
    fontSize: 12,
    marginTop: 3
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  activeBadge: {
    backgroundColor: "#e6f7ef"
  },
  inactiveBadge: {
    backgroundColor: "#f1f3f6"
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700"
  },
  activeText: {
    color: "#18804b"
  },
  inactiveText: {
    color: "#68778a"
  },
  userExpiryBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6"
  },
  userExpiryLabel: {
    color: "#8491a3",
    fontSize: 11,
    marginRight: 5
  },
  expiryValue: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600"
  },
  detailsLink: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: "auto"
  },
  userActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 7
  },
  actionButton: {
    minHeight: 37,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: "#edf2f8",
    marginRight: 7,
    marginBottom: 4
  },
  largeActionButton: {
    width: "100%",
    minHeight: 49,
    borderRadius: 13,
    marginRight: 0,
    marginBottom: 0
  },
  compactActionButton: {
    minHeight: 31,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 0
  },
  primaryButton: {
    backgroundColor: "#2563eb"
  },
  dangerButton: {
    backgroundColor: "#fff0ef"
  },
  disabledButton: {
    opacity: 0.5
  },
  actionText: {
    color: "#34445b",
    fontSize: 12,
    fontWeight: "700"
  },
  compactActionText: {
    fontSize: 11
  },
  largeActionText: {
    fontSize: 14
  },
  lightActionText: {
    color: "#fff"
  },
  dangerActionText: {
    color: "#b42318"
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#fff0ef",
    padding: 11
  },
  errorBannerText: {
    color: "#a12a24",
    fontSize: 13
  },
  emptyText: {
    color: "#718096",
    textAlign: "center",
    paddingVertical: 30,
    fontSize: 14
  },
  detailMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 8
  },
  detailLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14
  },
  sectionTitle: {
    color: "#132238",
    fontSize: 18,
    fontWeight: "800"
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    padding: 15,
    marginBottom: 9,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1
  },
  historyColumns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20
  },
  historyColumn: {
    flex: 1,
    minWidth: 0
  },
  historyPrimary: {
    color: "#132238",
    fontSize: 14,
    fontWeight: "700"
  },
  historySecondary: {
    color: "#748399",
    fontSize: 12,
    marginTop: 5
  },
  requestUser: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 7
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    padding: 15,
    marginBottom: 12,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1
  },
  profileAvatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#eaf1ff",
    marginRight: 12
  },
  profileAvatarText: {
    color: "#2456b3",
    fontSize: 19,
    fontWeight: "800"
  },
  profileInfo: {
    flex: 1,
    minWidth: 0
  },
  profileName: {
    color: "#132238",
    fontSize: 16,
    fontWeight: "800"
  },
  profileTelegram: {
    color: "#748399",
    fontSize: 12,
    marginTop: 4
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
    marginBottom: 8
  },
  sectionCount: {
    overflow: "hidden",
    color: "#2456b3",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 27,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#eaf1ff"
  },
  requestsSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    padding: 13,
    marginBottom: 12,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1
  },
  requestsSummaryMark: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#eaf1ff",
    marginRight: 11
  },
  requestsSummaryMarkText: {
    color: "#2456b3",
    fontSize: 17,
    fontWeight: "800"
  },
  requestsSummaryText: {
    flex: 1
  },
  requestsSummaryTitle: {
    color: "#203249",
    fontSize: 13,
    fontWeight: "800"
  },
  requestsSummaryHint: {
    color: "#8491a3",
    fontSize: 11,
    marginTop: 3
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    padding: 14,
    marginBottom: 8,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1
  },
  tabletRequestCard: {
    width: "48.5%"
  },
  requestCardTop: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  requestBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563eb",
    marginTop: 5,
    marginRight: 9
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e7edf5",
    backgroundColor: "#fff",
    shadowColor: "#102a43",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10
  },
  modalHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  modalIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#eaf1ff",
    marginRight: 11
  },
  modalIconText: {
    color: "#2456b3",
    fontSize: 21,
    fontWeight: "800"
  },
  modalHeadingText: {
    flex: 1
  },
  modalEyebrow: {
    color: "#8291a5",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 2
  },
  modalTitle: {
    color: "#132238",
    fontSize: 18,
    fontWeight: "800"
  },
  modalHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#edf0f5"
  },
  menuOverlay: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: Platform.OS === "android" ? 48 : 60,
    paddingHorizontal: 14,
    backgroundColor: "rgba(15, 23, 42, 0.32)"
  },
  menuPanel: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 9,
    backgroundColor: "#fff",
    shadowColor: "#102a43",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14
  },
  menuEyebrow: {
    color: "#8291a5",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3
  },
  menuTitle: {
    color: "#132238",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 2
  },
  menuCloseButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#f1f4f8"
  },
  menuCloseText: {
    color: "#536780",
    fontSize: 24,
    lineHeight: 27
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#edf0f5",
    marginBottom: 6
  },
  menuItem: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    borderRadius: 12
  },
  menuItemPressed: {
    backgroundColor: "#f5f7fb"
  },
  menuIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#eaf1ff",
    marginRight: 11
  },
  menuIconText: {
    color: "#2456b3",
    fontSize: 15,
    fontWeight: "800"
  },
  menuIconDanger: {
    backgroundColor: "#fff0ef"
  },
  menuIconDangerText: {
    color: "#b42318"
  },
  menuItemText: {
    flex: 1
  },
  menuItemLabel: {
    color: "#203249",
    fontSize: 14,
    fontWeight: "700"
  },
  menuItemDanger: {
    color: "#b42318"
  },
  menuItemHint: {
    color: "#8491a3",
    fontSize: 11,
    marginTop: 3
  },
  menuChevron: {
    color: "#a4afbd",
    fontSize: 24,
    marginLeft: 8
  }
});
