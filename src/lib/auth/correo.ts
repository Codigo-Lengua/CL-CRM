/**
 * Puerto de salida para los correos de autenticación (invitaciones y recuperación).
 * El proveedor real (SMTP o API) se conecta con el módulo de envío; mientras tanto,
 * en desarrollo se imprime en la consola y en producción falla para que no se pierda.
 */
export interface MensajeCorreo {
  para: string;
  asunto: string;
  texto: string;
}

export interface EnviadorCorreo {
  enviar(mensaje: MensajeCorreo): Promise<void>;
}

export const enviadorConsola: EnviadorCorreo = {
  enviar(m) {
    console.warn(`[correo] Para: ${m.para}\nAsunto: ${m.asunto}\n\n${m.texto}`);
    return Promise.resolve();
  },
};

export const enviadorNoConfigurado: EnviadorCorreo = {
  enviar() {
    return Promise.reject(new Error("No hay un proveedor de correo configurado."));
  },
};
