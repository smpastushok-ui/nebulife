package app.nebulife.game;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate so the bridge picks them up.
        registerPlugin(GoogleAuth.class);
        registerPlugin(ImmersivePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
