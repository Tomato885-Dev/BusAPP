/**
 * Avisos antes de la hora de la rutina.
 *
 * Son **notificaciones locales**: las programa el teléfono y se disparan sin
 * servidor ni conexión. Es lo correcto para este caso —la hora se sabe de
 * antemano— y además evita depender de credenciales de notificaciones remotas,
 * que exigen cuentas de desarrollador.
 *
 * En web no existen: el navegador no puede programar avisos para mañana a las
 * 7:25. Ahí la función no hace nada y la app sigue funcionando.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { horaTexto, type Rutina } from "./rutinas";

export const HAY_NOTIFICACIONES = Platform.OS !== "web";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function pedirPermiso(): Promise<boolean> {
  if (!HAY_NOTIFICACIONES) return false;
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Reprograma todos los avisos.
 *
 * Se cancela todo y se vuelve a programar en vez de llevar la cuenta de qué
 * aviso corresponde a qué rutina. Con pocas rutinas es más barato que mantener
 * un registro, y elimina de raíz los avisos huérfanos de rutinas ya borradas.
 */
export async function reprogramar(
  rutinas: Rutina[],
  nombrePorParadero: (id: string) => string,
): Promise<number> {
  if (!HAY_NOTIFICACIONES) return 0;
  if (!(await pedirPermiso())) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  let programados = 0;
  for (const rutina of rutinas) {
    if (!rutina.activa) continue;
    const aviso = rutina.hora - rutina.avisoMinutos;
    if (aviso < 0) continue;  // el aviso caería el día anterior

    for (const dia of rutina.dias) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Tu micro de las ${horaTexto(rutina.hora)}`,
          body: `Mira qué viene a ${nombrePorParadero(rutina.paraderoId)}`,
          data: { paraderoId: rutina.paraderoId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // expo-notifications usa 1 = domingo … 7 = sábado, mientras que las
          // rutinas usan 1 = lunes … 7 = domingo.
          weekday: (dia % 7) + 1,
          hour: Math.floor(aviso / 60),
          minute: aviso % 60,
        },
      });
      programados++;
    }
  }
  return programados;
}

export async function cancelarTodo(): Promise<void> {
  if (!HAY_NOTIFICACIONES) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
