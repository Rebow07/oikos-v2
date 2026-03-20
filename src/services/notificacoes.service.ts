import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuração do handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registrarNotificacoes(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão de notificação negada');
      return null;
    }

    // Canal para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Rebow Family',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c9a227',
      });

      await Notifications.setNotificationChannelAsync('lembretes', {
        name: 'Lembretes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
      });

      await Notifications.setNotificationChannelAsync('compras', {
        name: 'Compras',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    console.error('Erro ao registrar notificações:', error);
    return null;
  }
}

export async function agendarLembrete(
  titulo: string,
  corpo: string,
  data: Date,
): Promise<string> {
  const trigger = data.getTime() - Date.now();
  if (trigger <= 0) return '';

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: corpo,
      sound: true,
      data: { type: 'lembrete' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.floor(trigger / 1000),
    },
  });
  return id;
}

export async function agendarLembreteCompromisso(
  titulo: string,
  dataInicio: Date,
  minutosAntes: number = 30,
): Promise<string> {
  const dataLembrete = new Date(dataInicio.getTime() - minutosAntes * 60 * 1000);
  return agendarLembrete(
    `Compromisso: ${titulo}`,
    `Em ${minutosAntes} minutos`,
    dataLembrete,
  );
}

export async function cancelarNotificacao(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelarTodasNotificacoes(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
