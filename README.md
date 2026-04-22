# TodoApp — Ionic + Angular

Aplicación de lista de tareas (To-Do) con categorías, Firebase Remote Config y soporte para Android e iOS.

## Stack

- **Ionic 7** + **Angular 18** (Standalone Components)
- **Capacitor** para compilación nativa (Android / iOS)
- **Firebase Remote Config** para feature flags
- **localStorage** para persistencia de datos

---

## Funcionalidades

| Función | Descripción |
|--------|-------------|
| Tareas | Agregar, editar, marcar como completada, eliminar |
| Categorías | Crear, editar y eliminar categorías con color e ícono |
| Filtrado | Por categoría y por estado (activas / completadas) |
| Búsqueda | Búsqueda en tiempo real por título o descripción |
| Prioridad | Alta / Media / Baja (controlado por Remote Config) |
| Stats | Banner de progreso con contador (controlado por Remote Config) |
| Remote Config | Feature flags via Firebase sin redesplegar la app |

---

## Requisitos previos

```bash
node >= 18
npm >= 9
ionic CLI: npm install -g @ionic/cli
```

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/ionic-todo-app.git
cd ionic-todo-app

# 2. Instalar dependencias
npm install

# 3. Ejecutar en el navegador
ionic serve
```

---

## Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/) y crea un proyecto.
2. Habilita **Remote Config** en tu proyecto.
3. Copia las credenciales en `src/environments/environment.ts`:

```typescript
firebase: {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO_ID',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
}
```

### Feature flags (Remote Config)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `show_priority` | boolean | `true` | Muestra/oculta la prioridad en tareas |
| `show_stats_banner` | boolean | `true` | Muestra/oculta el banner de estadísticas |
| `enable_dark_mode_toggle` | boolean | `true` | Activa el botón de modo oscuro |
| `max_tasks_per_category` | number | `50` | Máximo de tareas por categoría |

---

## Compilar para Android

```bash
# 1. Build web
ionic build

# 2. Agregar plataforma Android (solo primera vez)
npx cap add android

# 3. Sincronizar cambios
npx cap sync android

# 4. Abrir en Android Studio
npx cap open android
```

En Android Studio: **Build → Generate Signed Bundle / APK → APK**

### Requisitos
- Android Studio instalado
- JDK 17+
- Android SDK (API 21+)

---

## Compilar para iOS

```bash
# 1. Build web
ionic build

# 2. Agregar plataforma iOS (solo primera vez)
npx cap add ios

# 3. Sincronizar cambios
npx cap sync ios

# 4. Abrir en Xcode
npx cap open ios
```

En Xcode: **Product → Archive → Distribute App**

### Requisitos
- macOS con Xcode 14+
- Apple Developer Account para IPA firmado
- CocoaPods: `sudo gem install cocoapods`

---

## Optimizaciones de rendimiento aplicadas

1. **Lazy loading de rutas** — cada página se carga solo cuando se navega a ella
2. **Standalone components** — eliminan el overhead de NgModules
3. **TrackBy en *ngFor** — evita re-renderizado innecesario de la lista
4. **RxJS takeUntil** — limpia subscripciones al destruir componentes
5. **BehaviorSubject + combineLatest** — filtrado reactivo sin iteraciones manuales
6. **localStorage** optimizado — un solo write por operación
7. **Lazy import de Firebase** — Remote Config se carga de forma diferida

---

## Estructura del proyecto

```
src/app/
├── models/
│   ├── task.model.ts
│   └── category.model.ts
├── services/
│   ├── storage.service.ts
│   ├── task.service.ts
│   ├── category.service.ts
│   └── remote-config.service.ts
├── home/                    # Página principal (lista de tareas)
├── pages/
│   └── categories/          # Gestión de categorías
└── modals/
    ├── add-task/            # Modal para agregar/editar tarea
    └── add-category/        # Modal para agregar/editar categoría
```

---

## Preguntas de la prueba

### ¿Cuáles fueron los principales desafíos?

- Migrar de NgModules a **Standalone Components** manteniendo la compatibilidad con Ionic
- Implementar **Firebase Remote Config** de forma condicional (funciona offline con valores por defecto)
- Diseñar el sistema de filtrado reactivo combinando múltiples observables con `combineLatest`

### ¿Qué técnicas de optimización aplicaste?

- Lazy loading de módulos y componentes vía `loadComponent`
- Uso de `trackBy` en listas para evitar re-renders
- Destrucción correcta de subscripciones con `takeUntil` para prevenir memory leaks
- Carga diferida de Firebase con `import()` dinámico

### ¿Cómo aseguraste la calidad del código?

- Separación clara de responsabilidades (Servicios / Páginas / Modales)
- Tipado estricto con TypeScript
- Un único punto de acceso al localStorage (`StorageService`)
- Lógica de negocio en servicios, no en componentes
