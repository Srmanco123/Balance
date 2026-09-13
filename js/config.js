// Configuración pública del proyecto. No contiene secretos:
// la apiKey de Firebase es un identificador, no una credencial.
// Lo que protege los datos son las reglas de Firestore.

export const firebaseConfig = {
  apiKey: "AIzaSyCsi46LKFjYYh4_pXQY9HeXyIvXHuuYJT0",
  authDomain: "balance-50507.firebaseapp.com",
  projectId: "balance-50507",
  storageBucket: "balance-50507.firebasestorage.app",
  messagingSenderId: "289103780358",
  appId: "1:289103780358:web:341da66bc9c6086cd48187"
};

// URL del Worker. Se rellena cuando esté desplegado.
export const WORKER = "";

// Interruptores por tanda: los módulos no entregados se apagan aquí,
// no se comentan en el código.
export const MODULOS = {
  comida: false,
  entreno: false,
  progreso: false,
  motor: false
};

export const ZONA_HORARIA = "Europe/Madrid";

// Se muestra en Ajustes: sirve para saber de un vistazo qué versión está sirviendo
// GitHub Pages, que cachea diez minutos.
export const VERSION = "0.2 — alta de perfil";
