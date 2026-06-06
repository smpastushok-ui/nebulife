package app.nebulife.game;

import android.os.Bundle;
import android.view.Window;
import androidx.appcompat.app.ActionBar;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        EdgeToEdge.enable(this);
        // Register plugins BEFORE super.onCreate so the bridge picks them up.
        registerPlugin(GoogleAuth.class);
        registerPlugin(ImmersivePlugin.class);
        super.onCreate(savedInstanceState);
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) actionBar.hide();
        // Android 15 (API 35) enforces edge-to-edge: setStatusBarColor /
        // setNavigationBarColor are deprecated no-ops. We rely on EdgeToEdge
        // (transparent system bars) + the web content's #020510 background,
        // which shows through behind the bars for the same visual result.
    }
}
