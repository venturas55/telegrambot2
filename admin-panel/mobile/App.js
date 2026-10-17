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
  View
} from "react-native";
import {
  activateSubscription,
  ApiError,
  getSession,
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

function ActionButton({ label, onPress, variant = "secondary", disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === "primary" && styles.primaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabledButton
      ]}
    >
      <Text
        style={[
          styles.actionText,
          variant === "primary" && styles.lightActionText,
          variant === "danger" && styles.dangerActionText
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function UserCard({
  user,
  busy,
  onActivate,
  onRevoke,
  onPay,
  onRemove,
  onEditExpiration
}) {
  const isActive = user.estado === "activo";
  const hasAccess = Boolean(user.has_access);
  const displayName = user.username || user.nombre || "Usuario sin nombre";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
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

      <View style={styles.expiryBlock}>
        <Text style={styles.expiryLabel}>Suscripción hasta</Text>
        <Text style={styles.expiryValue}>{formatDate(user.end_date)}</Text>
      </View>

      <View style={styles.actions}>
        {user.subscripcion_id != null && (
          <>
            <ActionButton
              label={isActive ? "Revocar" : "Activar"}
              variant={isActive ? "danger" : "primary"}
              disabled={busy}
              onPress={() =>
                isActive ? onRevoke(user) : onActivate(user)
              }
            />
            <ActionButton
              label="Registrar pago"
              disabled={busy}
              onPress={() => onPay(user)}
            />
            <ActionButton
              label="Editar fecha"
              disabled={busy}
              onPress={() => onEditExpiration(user)}
            />
          </>
        )}
        <ActionButton
          label="Eliminar"
          variant="danger"
          disabled={busy}
          onPress={() => onRemove(user)}
        />
      </View>
    </View>
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
        <Text style={styles.loginTitle}>Panel de administración</Text>
        <Text style={styles.loginSubtitle}>Gestión de usuarios</Text>

        <Text style={styles.inputLabel}>Usuario</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setUsername}
          placeholder="Tu usuario"
          placeholderTextColor="#91a0b2"
          style={styles.input}
          value={username}
        />

        <Text style={styles.inputLabel}>Contraseña</Text>
        <TextInput
          onChangeText={setPassword}
          onSubmitEditing={() => onLogin(username, password)}
          placeholder="Tu contraseña"
          placeholderTextColor="#91a0b2"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ActionButton
          label={busy ? "Entrando..." : "Iniciar sesión"}
          variant="primary"
          disabled={busy || !username.trim() || !password}
          onPress={() => onLogin(username, password)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function App() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
          <Text style={styles.title}>Usuarios</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryCount}>{users.length}</Text>
        <Text style={styles.summaryLabel}>
          {users.length === 1 ? "usuario registrado" : "usuarios registrados"}
        </Text>
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

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredUsers}
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
            <Text style={styles.modalTitle}>Editar expiración</Text>
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
    paddingHorizontal: 22
  },
  loginCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    shadowColor: "#102a43",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#dbeafe",
    marginBottom: 20
  },
  brandMarkText: {
    color: "#1d4ed8",
    fontSize: 22,
    fontWeight: "800"
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
    marginBottom: 24
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
  errorText: {
    color: "#b42318",
    fontSize: 13,
    marginBottom: 14
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  eyebrow: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4
  },
  title: {
    color: "#132238",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 2
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#e7eef7"
  },
  logoutText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700"
  },
  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 20,
    marginBottom: 14
  },
  summaryCount: {
    color: "#1d4ed8",
    fontSize: 19,
    fontWeight: "800",
    marginRight: 7
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 13
  },
  searchInput: {
    height: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e7f0",
    borderRadius: 13,
    backgroundColor: "#fff",
    color: "#132238",
    fontSize: 14,
    paddingHorizontal: 14
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#e8edf4",
    padding: 15,
    marginBottom: 12
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf1ff",
    marginRight: 11
  },
  avatarText: {
    color: "#2456b3",
    fontWeight: "800",
    fontSize: 17
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
  expiryBlock: {
    paddingVertical: 14,
    marginTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6"
  },
  expiryLabel: {
    color: "#8491a3",
    fontSize: 11,
    marginBottom: 4
  },
  expiryValue: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 1
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
    borderRadius: 18,
    padding: 20,
    backgroundColor: "#fff"
  },
  modalTitle: {
    color: "#132238",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6
  },
  modalHint: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: 16
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 3
  }
});
