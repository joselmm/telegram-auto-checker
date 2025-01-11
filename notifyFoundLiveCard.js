import notifier from 'node-notifier';
// String

export default function notificarLiveEncontrada(card) {
  notifier.notify(
    {
      title: 'Live Encontrada',
      message: ''+card,
      icon: './check-icon.png',
      sound: true, // Only Notification Center or Windows Toasters
      wait: false // Wait with callback, until user action is taken against notification, does not apply to Windows Toasters as they always wait or notify-send as it does not support the wait option
    },
    function (err, response, metadata) {
      // Response is response from notification
      // Metadata contains activationType, activationAt, deliveredAt
    }
  );
}       