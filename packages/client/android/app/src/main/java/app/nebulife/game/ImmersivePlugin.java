package app.nebulife.game;

import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * ImmersivePlugin — hides the Android status bar + navigation bar for
 * fullscreen gameplay. Uses the modern WindowInsetsController API on
 * Android 11+ (API 30+) with a legacy setSystemUiVisibility fallback for
 * older devices.
 *
 * Only used during the Space Arena TPS mode; the rest of the app runs in
 * normal (non-immersive) mode.
 *
 * Sticky behavior: if the user swipes from a screen edge, the system bars
 * appear as a translucent overlay for a few seconds and then auto-hide
 * again without disturbing the game layout.
 */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {

    @PluginMethod
    public void enter(PluginCall call) {
        getActivity().runOnUiThread(() -> applyImmersive(true));
        call.resolve();
    }

    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().runOnUiThread(() -> applyImmersive(false));
        call.resolve();
    }

    private void applyImmersive(boolean hide) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ — WindowInsetsController is the official API.
            WindowInsetsController controller =
                    getActivity().getWindow().getInsetsController();
            if (controller == null) return;
            if (hide) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            } else {
                controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            // Legacy (Android 10 and below) — flag-based approach.
            View decor = getActivity().getWindow().getDecorView();
            if (hide) {
                decor.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_FULLSCREEN);
            } else {
                decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
        }
    }
}
