# TodoApp — Ionic + Angular

Aplicación móvil de lista de tareas con categorías, autenticación, base de datos en la nube y feature flags via Firebase Remote Config.

---

## Stack tecnológico

| Tecnología | Uso |
|---|---|
| **Ionic 8** + **Angular 20** | Framework UI + framework web |
| **Standalone Components** | Arquitectura sin NgModules |
| **Cordova** | Compilación nativa Android / iOS |
| **Firebase Auth** | Autenticación con email y contraseña |
| **Firebase Firestore** | Base de datos en la nube por usuario |
| **Firebase Remote Config** | Feature flags sin redesplegar la app |
| **RxJS** | Estado reactivo con BehaviorSubject + combineLatest |

---

## Funcionalidades

| Función | Descripción |
|---|---|
| Onboarding | Pantalla de bienvenida con 3 slides |
| Registro / Login | Crear cuenta e iniciar sesión con email y contraseña |
| Logout | Cierra sesión y limpia los datos locales |
| Tareas | Agregar, editar, completar y eliminar tareas |
| Categorías | Crear, editar y eliminar categorías con color e ícono |
| Filtrado | Por categoría y por estado (todas / activas / completadas) |
| Búsqueda | Búsqueda en tiempo real por título o descripción |
| Prioridad | Alta / Media / Baja (activable via Remote Config) |
| Stats | Banner de progreso con contadores (activable via Remote Config) |
| Datos por usuario | Cada usuario ve únicamente sus propias tareas y categorías |
| Offline | Firestore cachea datos localmente sin conexión |

---

## Requisitos previos

```bash
Node >= 18
npm >= 9
@ionic/cli        →  npm install -g @ionic/cli
cordova           →  npm install -g cordova
Android Studio    →  Para compilar APK (Android)
Xcode + macOS     →  Para compilar IPA (iOS)
```

---

## Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone https://github.com/dgh09/ionic-todo-app.git
cd ionic-todo-app

# 2. Instalar dependencias
npm install

# 3. Ejecutar en el navegador
ionic serve
```

La app estará disponible en `http://localhost:8100`.

---

## Configuración de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/) y crea un proyecto.
2. Registra una app web y copia las credenciales en `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO_ID',
    storageBucket: 'TU_PROYECTO.firebasestorage.app',
    messagingSenderId: 'TU_SENDER_ID',
    appId: 'TU_APP_ID',
  },
};
```

3. Habilita los siguientes servicios en Firebase Console:

| Servicio | Configuración |
|---|---|
| **Authentication** | Habilitar proveedor Email/Password |
| **Firestore Database** | Crear base de datos en modo Test |
| **Remote Config** | Crear los parámetros descritos abajo |

### Feature flags — Remote Config

| Parámetro | Tipo | Default | Efecto |
|---|---|---|---|
| `show_priority` | Boolean | `true` | Muestra u oculta la etiqueta de prioridad en cada tarea |
| `show_stats_banner` | Boolean | `true` | Muestra u oculta el banner de estadísticas en home |

> Si Firebase no está configurado, la app funciona en **modo demo** con los valores por defecto.

---

## Estructura de datos en Firestore

Cada usuario tiene su propia colección de datos:

```
users/
  {uid}/
    tasks/
      {taskId}  →  { title, description, completed, categoryId, priority, createdAt }
    categories/
      {categoryId}  →  { name, color, icon }
```

Al registrarse por primera vez, se crean automáticamente 3 categorías por defecto: Personal, Trabajo y Compras.

---

## Compilar para Android (APK)

```bash
# 1. Build del proyecto web
npm run build

# 2. Agregar plataforma Android (solo la primera vez)
npm run cordova:add:android

# 3. Compilar APK en modo debug
npm run cordova:build:android

# 4. Compilar APK en modo producción
npm run cordova:build:android:prod
```

El APK se genera en:
```
platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

### Requisitos Android
- Android Studio instalado
- JDK 17+
- Android SDK API 22+
- Variable `ANDROID_HOME` configurada

---

## Compilar para iOS (IPA)

> Requiere macOS con Xcode instalado.

```bash
# 1. Build del proyecto web
npm run build

# 2. Agregar plataforma iOS (solo la primera vez)
npm run cordova:add:ios

# 3. Compilar para iOS
npm run cordova:build:ios:prod
```

Luego en Xcode: **Product → Archive → Distribute App**

### Requisitos iOS
- macOS con Xcode 14+
- Apple Developer Account
- CocoaPods: `sudo gem install cocoapods`

---

## Estructura del proyecto

```
src/app/
├── models/
│   ├── task.model.ts          # Interfaz Task
│   └── category.model.ts      # Interfaz Category
├── services/
│   ├── auth.service.ts        # Firebase Auth (login, registro, logout)
│   ├── task.service.ts        # CRUD tareas → Firestore + fallback localStorage
│   ├── category.service.ts    # CRUD categorías → Firestore + fallback localStorage
│   ├── remote-config.service.ts  # Feature flags via Firebase
│   └── storage.service.ts     # Wrapper de localStorage (fallback offline)
├── pages/
│   ├── landing/               # Onboarding (3 slides)
│   ├── login/                 # Login y registro dual
│   └── categories/            # Gestión de categorías
├── home/                      # Página principal con lista de tareas
└── modals/
    ├── add-task/              # Modal agregar / editar tarea
    └── add-category/          # Modal agregar / editar categoría
```

---

## Scripts disponibles

```bash
npm start                          # Servidor de desarrollo
npm run build                      # Build de producción
npm run cordova:add:android        # Agrega plataforma Android
npm run cordova:add:ios            # Agrega plataforma iOS
npm run cordova:build:android      # Compila APK debug
npm run cordova:build:android:prod # Compila APK producción
npm run cordova:build:ios:prod     # Compila IPA producción
npm run cordova:run:android        # Ejecuta en emulador/dispositivo Android
```

---

## Preguntas de la prueba técnica

### ¿Cuáles fueron los principales desafíos?

- **Migración de Capacitor a Cordova** — el proyecto partía con Capacitor; fue necesario reconfigurar los builders de Angular (`@ionic/angular-toolkit`), crear el `config.xml` y ajustar los scripts de build.
- **Sincronización de estado con Firestore** — coordinar el ciclo de vida de los listeners `onSnapshot` con el estado de autenticación para evitar lecturas de datos de otros usuarios o listeners huérfanos.
- **Inicialización asíncrona de Firebase** — Firebase se carga con `import()` dinámico para no bloquear el arranque de la app; los servicios deben funcionar correctamente tanto antes como después de que Firebase esté listo.
- **Remote Config con fallback offline** — si Firebase no está disponible o las credenciales son placeholder, la app sigue funcionando con valores por defecto sin lanzar errores.

### ¿Qué técnicas de optimización de rendimiento aplicaste?

- **Lazy loading de rutas** con `loadComponent` — cada página se descarga solo cuando el usuario navega a ella, reduciendo el bundle inicial.
- **Standalone Components** — eliminan el overhead de NgModules y permiten tree-shaking más agresivo.
- **`onSnapshot` de Firestore** — actualización en tiempo real sin polling; Firestore sirve desde caché local offline cuando no hay conexión.
- **`combineLatest` + `BehaviorSubject`** — el filtrado de tareas es puramente reactivo, sin iteraciones manuales ni re-renders innecesarios.
- **`takeUntil(destroy$)`** — todas las subscripciones RxJS se limpian al destruir el componente para evitar memory leaks.
- **Dynamic import de Firebase** — los módulos de Firebase (`firebase/auth`, `firebase/firestore`, `firebase/remote-config`) se importan de forma diferida, reduciendo el tiempo de carga inicial.
- **Fire-and-forget en escrituras** — las operaciones de escritura en Firestore no bloquean la UI; `onSnapshot` actualiza la lista automáticamente cuando el servidor confirma.

### ¿Cómo aseguraste la calidad y mantenibilidad del código?

- **Separación de responsabilidades** — servicios manejan toda la lógica de negocio y acceso a datos; los componentes solo gestionan la UI.
- **Tipado estricto con TypeScript** — interfaces `Task`, `Category` y `AuthUser` garantizan consistencia en toda la app.
- **Fallback en cada capa** — Auth, Firestore y Remote Config degradan graciosamente a modo demo/localStorage si Firebase no está disponible.
- **Gestión del ciclo de vida de listeners** — `unsubscribeSnapshot` y `authSub` se cancelan correctamente en `ngOnDestroy` para evitar fugas de memoria.
- **Patrón único de acceso a datos** — toda operación de lectura/escritura pasa por el servicio correspondiente, nunca directamente desde componentes.

---

## Archivos de entrega

- Repositorio: [github.com/dgh09/ionic-todo-app](https://github.com/dgh09/ionic-todo-app)
- APK Android: *(adjunto en la entrega)*
- IPA iOS: *(requiere macOS — documentado en sección de compilación)*
