const fs = require('fs');
const path = require('path');
const {
    withAndroidManifest,
    withDangerousMod,
    AndroidConfig,
} = require('@expo/config-plugins');

const RECEIVER_CLASS = 'com.centsible.app.SmsExpenseReceiver';

function withSmsReceiverManifest(config) {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults;
        const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

        if (!app.receiver) {
            app.receiver = [];
        }

        const exists = app.receiver.some((r) => r.$?.['android:name'] === RECEIVER_CLASS);
        if (!exists) {
            app.receiver.push({
                $: {
                    'android:name': RECEIVER_CLASS,
                    'android:exported': 'true',
                    'android:permission': 'android.permission.BROADCAST_SMS',
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: {
                                    'android:name': 'android.provider.Telephony.SMS_RECEIVED',
                                },
                            },
                        ],
                    },
                ],
            });
        }

        return config;
    });
}

function withSmsReceiverSource(config) {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const packagePath = path.join(
                config.modRequest.platformProjectRoot,
                'app',
                'src',
                'main',
                'java',
                'com',
                'centsible',
                'app'
            );
            fs.mkdirSync(packagePath, { recursive: true });

            const src = path.join(__dirname, 'android', 'SmsExpenseReceiver.kt');
            const dest = path.join(packagePath, 'SmsExpenseReceiver.kt');
            fs.copyFileSync(src, dest);

            return config;
        },
    ]);
}

module.exports = function withSmsReceiver(config) {
    config = withSmsReceiverManifest(config);
    config = withSmsReceiverSource(config);
    return config;
};
