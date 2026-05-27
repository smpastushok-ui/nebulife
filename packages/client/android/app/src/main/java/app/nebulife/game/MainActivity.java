package app.nebulife.game;

import android.graphics.Color;
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
        getWindow().setStatusBarColor(Color.parseColor("#020510"));
        getWindow().setNavigationBarColor(Color.parseColor("#020510"));
    }
}
