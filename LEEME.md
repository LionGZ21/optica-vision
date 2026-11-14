# Óptica Visión · Backend completo — GUÍA DESDE CERO

## 0. Requisitos (una sola vez)
- Visual Studio 2022 (17.8 o superior) con la carga de trabajo "ASP.NET y desarrollo web".
- .NET SDK 10 (comando `dotnet --version` debe mostrar 10.x). Si muestra 8.x o 9.x, ver la nota del paso 3.
- Cuenta gratuita en https://supabase.com

## 1. Crear el proyecto en Supabase
1. New project -> nombre "optica-vision" -> escriba una contraseña de base de datos (SIN el signo ;) y guárdela.
2. Elija una región cercana. Espere a que termine de crearse.
3. Pulse "Connect" -> pestaña "Session pooler" -> anote: host (aws-0-XXXX.pooler.supabase.com),
   usuario (postgres.TUREFERENCIA) y puerto (5432).

## 2. Crear las tablas de negocio
Supabase -> SQL Editor -> New query -> pegue TODO BaseDeDatos/01_esquema_fase1.sql -> Run.
(Si ya lo ejecutó antes, NO lo repita.)

## 3. Configurar el proyecto
1. Descomprima el ZIP.
2. Abra OpticaVision\OpticaVision.Api\appsettings.Development.json y reemplace REGION, TUREFERENCIA y
   TU_PASSWORD_DB en la cadena de conexión.
3. SDK 8 o 9: en OpticaVision.Api.csproj cambie net10.0 -> net8.0 (o net9.0) y 10.* -> 8.* (o 9.*).

## 4. Crear las tablas de usuarios (Identity)  [omitir si ya existen las tablas usuario y rol]
Abra OpticaVision.sln en Visual Studio -> menú Ver -> Terminal. Ejecute:

    cd OpticaVision.Api
    dotnet tool install --global dotnet-ef
    dotnet build

PowerShell:  $env:ASPNETCORE_ENVIRONMENT="Development"
CMD:         set ASPNETCORE_ENVIRONMENT=Development

    dotnet ef migrations add IdentityInicial -o Data/Migrations
    dotnet ef database update

## 5. Seguridad (RLS)
Supabase -> SQL Editor -> pegue BaseDeDatos/02_rls_identity.sql -> Run.

## 6. Ejecutar
Confianza en el certificado (una vez):  dotnet dev-certs https --trust
Pulse F5 (perfil "https"). Se abre https://localhost:7100/scalar/v1

## 7. Probar
Abra OpticaVision.Api/Pruebas/fase3.http y ejecute en orden: login, crear artículo, precio, entrada de 10,
salida de 999 (debe dar 409 "Stock insuficiente").

---------------------------------------------------------------------
## FASE 4 · FRONTEND (carpeta optica-vision-web)

Requisito (una sola vez): Node.js 22 LTS (mínimo 20.19) desde https://nodejs.org
Verifique:  node -v   y   npm -v

Pasos (la API de ASP.NET debe estar en ejecución con F5, perfil https, puerto 7100):

    cd optica-vision-web
    npm install
    npm run dev

Abra http://localhost:5173 e ingrese con el administrador (admin@opticavision.com / Admin#2026Optica).
El Inicio debe mostrar "Conectada correctamente".

Notas
- En desarrollo, Vite reenvía /api a https://localhost:7100 (vite.config.js). Si cambia el puerto de la API,
  edite "target" en vite.config.js.
- La navegación y los permisos por rol están en src/config/navigation.jsx y src/auth/roles.js.
- Las pantallas de cada módulo muestran "Fase 5" hasta que se construyan.

---------------------------------------------------------------------
## FASE 5 · PANTALLAS (ya incluidas en optica-vision-web)

Para actualizar desde la Fase 4 basta con reemplazar la carpeta optica-vision-web por la de este ZIP y ejecutar de nuevo:

    cd optica-vision-web
    npm install
    npm run dev

Pantallas disponibles
- Inventario: Artículos (lista, alta/edición, detalle con precios, proveedores y stock), Stock (y "Bajo el mínimo"),
  Kardex (con registro de movimientos), Catálogos (taxonomía y marcas), Proveedores.
- Ventas: Facturación (lista), Nueva venta, Detalle (confirmar, pagos, anular).
- Clínica: Agenda médica (vista semanal, nueva cita, cambio de estado, reprogramar, alta de profesionales) y Pacientes.

Orden recomendado para la primera prueba (base vacía)
1. Inventario > Catálogos: ya existe una taxonomía y la marca GENÉRICA de ejemplo (puede agregar más).
2. Inventario > Artículos > Nuevo artículo.
3. En el detalle del artículo: "Guardar precio" (lista General) -> sin precio no se puede facturar.
4. Inventario > Kardex > Registrar movimiento: ENTRADA de 10 unidades en la bodega de venta.
5. Ventas > Nueva venta > agregar el artículo > "Guardar y confirmar".
6. Clínica > Agenda > Profesionales > agregar uno; luego Pacientes > Nuevo paciente; luego Nueva cita.

---------------------------------------------------------------------
## FASE 5 (COMPLETA) · pantallas restantes ya incluidas

- Inventario > Traslados: crear (origen -> camión de tránsito -> destino), despachar, recibir, cancelar.
- Inventario > Consignaciones: crear, recibir mercadería, liquidar lo vendido, devolver lo no vendido, cerrar.
- Clínica > Expedientes: antecedentes, consultas (agudeza visual, PIO, diagnóstico) y recetas (OD/OI).
- Laboratorio > Órdenes de trabajo: crear desde la receta, consumir montura y cristales del inventario,
  avanzar estados (proceso -> control de calidad -> lista -> entregada).

Para actualizar: reemplace la carpeta optica-vision-web por la de este ZIP y ejecute  npm install  y  npm run dev.
El backend no cambió en esta entrega.

Prueba del flujo clínico completo
1. Pacientes > Nuevo paciente (se crea su expediente).
2. Expedientes > buscar paciente > Nueva consulta > en la consulta, "Nueva receta".
3. Inventario: tener en stock una montura y un lente en blanco (Kardex > ENTRADA).
4. Laboratorio > Nueva orden: elegir paciente, receta, sucursal, bodega y agregar montura + lentes.
5. En la orden: "Consumir material" (baja el inventario) y luego avanzar hasta "Entregada".

Siguiente etapa: Fase 6 (documentación en formato APA 7.ª edición e instrucciones de despliegue).
