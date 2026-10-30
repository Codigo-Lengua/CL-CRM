import "dotenv/config";
import { Client } from "pg";

/** Id de la invitación pendiente de un correo. Reemplaza al correo, que aún no tiene proveedor. */
export async function idInvitacionPendiente(email: string): Promise<string> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    const { rows } = await cliente.query<{ id: string }>(
      "select id from invitation where email = $1 and status = 'pending' order by \"createdAt\" desc limit 1",
      [email],
    );
    if (!rows[0]) throw new Error(`No hay invitación pendiente para ${email}.`);
    return rows[0].id;
  } finally {
    await cliente.end();
  }
}
