// Usado por el workflow de despliegue: termina con error fuera de la ventana.
import { revisarVentanaDespliegue } from "../src/modules/calendario/dominio/ventana-despliegue";

const resultado = revisarVentanaDespliegue(new Date());
console.log(resultado.motivo);
process.exit(resultado.permitido ? 0 : 1);
