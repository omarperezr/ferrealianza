# Sistema de Gestión de Inventario - FerreAlianza

## Descripción
Sistema completo de gestión de inventario y pedidos para FerreAlianza con las siguientes funcionalidades:

### Funciones para Administradores:
- ✅ Crear, editar y eliminar productos manualmente
- ✅ Importar productos desde archivos Excel
- ✅ Subir imágenes de productos
- ✅ Ver y gestionar todos los productos
- ✅ Crear pedidos

### Funciones para Usuarios:
- ✅ Ver catálogo de productos
- ✅ Buscar productos por nombre, código o categoría
- ✅ Añadir productos al carrito
- ✅ Crear pedidos con descuentos e impuestos
- ✅ Exportar pedidos a PDF, Excel o texto

## Configuración Inicial

### 1. Desplegar el Servidor Supabase
Para que el sistema funcione, debes desplegar la función Edge de Supabase:

1. Ve a la **página de configuración de Make**
2. Busca la sección de **Supabase**
3. Haz clic en **"Deploy Edge Function"** o **"Desplegar Función"**
4. Espera a que se complete el despliegue

### 2. Crear el Primer Usuario Administrador
Para crear tu primer usuario administrador, puedes usar una de estas opciones:

#### Opción A: Desde la interfaz de registro
1. Abre la aplicación
2. Haz clic en "¿No tienes cuenta? Regístrate"
3. Completa el formulario:
   - Nombre completo
   - Correo electrónico
   - Contraseña
   - Rol: Selecciona **"Administrador"**
4. Haz clic en "Registrar"
5. Inicia sesión con tus credenciales

#### Opción B: Desde Supabase Dashboard (recomendado para producción)
1. Ve a tu proyecto en Supabase
2. Navega a **Authentication** > **Users**
3. Crea un nuevo usuario manualmente
4. En los metadatos del usuario, añade:
   ```json
   {
     "name": "Tu Nombre",
     "role": "admin"
   }
   ```

## Uso del Sistema

### Como Administrador:

#### Añadir Productos Manualmente:
1. Haz clic en "Nuevo Producto"
2. Completa el formulario:
   - Código (único)
   - Nombre del producto
   - Categoría
   - Cantidad por paquete (opcional)
   - Precio
   - Imagen (opcional)
3. Haz clic en "Crear"

#### Importar Productos desde Excel:
1. Prepara un archivo Excel (.xlsx o .xls) con las siguientes columnas:
   - `codigo` o `code`: Código único del producto
   - `nombre` o `name`: Nombre del producto
   - `categoria` o `category`: Categoría del producto
   - `cantidadPorPaquete` o `amountPerPackage`: Cantidad por paquete (opcional)
   - `precio` o `price`: Precio del producto

   **Ejemplo:**
   | codigo | nombre | categoria | cantidadPorPaquete | precio |
   |--------|--------|-----------|-------------------|--------|
   | 001 | Martillo | Herramientas | 1 | 15.50 |
   | 002 | Clavos | Ferretería | 100 | 5.00 |

2. Haz clic en "Importar Excel"
3. Selecciona tu archivo
4. Los productos se importarán automáticamente

#### Editar o Eliminar Productos:
- Para editar: Haz clic en el botón "Editar" del producto
- Para eliminar: Haz clic en "Eliminar" y confirma

### Como Usuario:

#### Crear un Pedido:
1. Busca productos usando la barra de búsqueda
2. Haz clic en "Añadir al Carrito" en los productos deseados
3. Haz clic en el ícono del carrito en la esquina superior derecha
4. Ajusta las cantidades usando los botones + y -
5. Añade descuento o impuesto si es necesario (en porcentaje)
6. Exporta el pedido en el formato deseado:
   - **PDF**: Documento formateado profesionalmente
   - **Excel**: Hoja de cálculo con todos los datos
   - **Texto**: Archivo de texto plano

## Atributos de Productos

Cada producto tiene los siguientes atributos:
- **Código**: Identificador único del producto
- **Nombre**: Nombre descriptivo del producto
- **Categoría**: Clasificación del producto
- **Cantidad por Paquete**: Unidades incluidas por paquete (opcional)
- **Imagen**: Fotografía del producto (opcional)
- **Precio**: Precio unitario en dólares

## Estructura de Pedidos

Los pedidos exportados incluyen:
- Lista completa de productos seleccionados
- Cantidad de cada producto
- Precio unitario y total por producto
- Subtotal
- Descuento aplicado (%)
- Impuesto aplicado (%)
- **Total final**

## Soporte Técnico

Si encuentras algún problema:
1. Verifica que la función Edge de Supabase esté desplegada
2. Asegúrate de tener una conexión activa a Internet
3. Revisa que tu usuario tenga los permisos correctos (admin o user)
4. Contacta al administrador del sistema

---

**Desarrollado para FerreAlianza Import, C.A.**
