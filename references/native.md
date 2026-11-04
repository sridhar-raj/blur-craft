# Glass in native apps

The method in SKILL.md (compose the light, choose thickness by how much text the glass carries, measure
contrast at the worst point, avoid glass on glass) is platform-independent. This page maps the web
material onto each native toolkit. API names were checked against current docs in November 2026. The
SwiftUI example below was **type-checked with Xcode against the iOS 27.2 SDK** (targeting iOS 17, with the
iOS 26 availability gate); a deliberately wrong API in the same test failed to compile, so the check is
real. The Flutter, React Native and Compose code is from current docs but was not compiled here.

| Web (blur-craft) | SwiftUI | UIKit | Flutter | React Native (Expo) | Jetpack Compose |
|---|---|---|---|---|---|
| `glass--clear`…`glass--thick` | `.ultraThinMaterial` … `.thickMaterial` | `UIBlurEffect(style:)` in `UIVisualEffectView` | `BackdropFilter(ImageFilter.blur(…))` | `<BlurView intensity tint>` | Haze `hazeEffect` + `HazeMaterials` |
| Liquid Glass (refraction) | `.glassEffect(_:in:)` (iOS 26) | `UIGlassEffect` (iOS 26) | none built in | none built in | none built in |
| Merging shapes (recipe 11) | `GlassEffectContainer(spacing:)`, `glassEffectID`, `glassEffectUnion` | `UIGlassContainerEffect` | `BackdropGroup` shares one backdrop (performance, not merging) | n/a | n/a |
| Tinted level / reduce transparency | automatic (system settings) | automatic | check `MediaQuery.highContrastOf`; supply a solid fallback | `AccessibilityInfo.isReduceTransparencyEnabled()` (iOS) | `RenderEffect` needs API 31; fallback is a tinted surface |

## SwiftUI and UIKit (iOS, iPadOS, macOS, visionOS)

- Standard materials: `.background(.regularMaterial, in: .rect(cornerRadius: 24))`; thickness
  `.ultraThinMaterial` → `.thickMaterial` follows Apple's text-amount rule (HIG).
- Liquid Glass (iOS 26+): `.glassEffect()` defaults to the regular variant in a capsule;
  `.glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 20))`. Put `.glassEffect`
  last in the modifier chain, and gate it with `if #available(iOS 26, *)` with a material fallback.
- Group glass in `GlassEffectContainer(spacing: 40)` so shapes render together and merge within the
  spacing; morph with `glassEffectID(_:in:)` and a `@Namespace`. Apple: limit simultaneous glass effects.
- System settings (Reduce Transparency, Increase Contrast, the iOS 26.1 Clear/Tinted switch, iOS 27's
  slider) apply automatically to system materials. Custom glass should read them:
  `@Environment(\.accessibilityReduceTransparency)`.
- Text on materials: use the hierarchical styles (`.primary`, `.secondary`) so vibrancy applies, not fixed
  greys.
Verified example (standard material, Liquid Glass with a fallback, a morphing container, Reduce
Transparency):

```swift
import SwiftUI

struct PlayerCard: View {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Namespace private var ns
    @State private var expanded = false

    var body: some View {
        VStack(spacing: 16) {
            // Standard material, thickness by text amount
            Text("Evening wind-down")
                .padding(20)
                .background(.regularMaterial, in: .rect(cornerRadius: 24))

            // Liquid Glass (iOS 26+), gated with a material fallback
            if #available(iOS 26, *) {
                GlassEffectContainer(spacing: 40) {
                    HStack(spacing: 24) {
                        Image(systemName: "play.fill")
                            .frame(width: 56, height: 56)
                            .glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 20))
                            .glassEffectID("play", in: ns)
                        if expanded {
                            Image(systemName: "forward.fill")
                                .frame(width: 56, height: 56)
                                .glassEffect()
                                .glassEffectID("next", in: ns)
                        }
                    }
                }
            } else {
                Image(systemName: "play.fill").padding().background(.thinMaterial, in: .capsule)
            }

            // Respect Reduce Transparency for custom glass
            Text("Now playing")
                .foregroundStyle(.secondary)
                .padding()
                .background(reduceTransparency ? AnyShapeStyle(Color.black) : AnyShapeStyle(.ultraThinMaterial),
                            in: .rect(cornerRadius: 16))
        }
    }
}
```

Note: `glassEffect` takes a `Glass` value and a shape; there is no `intensity:` parameter (some third-party
guides show one; it doesn't compile).

- Docs: https://developer.apple.com/documentation/swiftui/glasseffectcontainer ·
  https://developer.apple.com/design/human-interface-guidelines/materials

## Flutter

```dart
ClipRRect(                                   // required: without a clip the blur covers the whole screen
  borderRadius: BorderRadius.circular(24),
  child: BackdropFilter(
    filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
    child: Container(color: Colors.black.withValues(alpha: 0.45), child: content),
  ),
)
```

- Several blurred surfaces on screen (a list of glass cards): wrap them in `BackdropGroup` and use
  `BackdropFilter.grouped(...)` so they share one backdrop read (Flutter 3.29+). Benefit is clearest with
  many simultaneous blurs; profile on target devices.
- `sigma` is a standard deviation like CSS `blur()`'s radius: sigma 16 ≈ CSS `blur(16px)`.
- Saturation isn't part of `ImageFilter.blur`; compose `ImageFilter.compose(outer: ColorFilter.matrix(...),
  inner: ImageFilter.blur(...))` for the 160–180% saturation the material uses.
- Docs: https://api.flutter.dev/flutter/widgets/BackdropGroup-class.html ·
  https://flutter.dev/blog/whats-new-in-flutter-3-29

## React Native (Expo)

```tsx
import { BlurView } from "expo-blur";
<BlurView intensity={60} tint="dark" style={{ borderRadius: 24, overflow: "hidden" }}>{content}</BlurView>
```

- `intensity` 1–100 (default 50); `tint` adds a translucent colour layer over the blur.
- Android: blur needs opting in. Current SDKs wrap the blurred content in `BlurTargetView` and set
  `blurMethod="dimezisBlurView"` (older SDKs: `experimentalBlurMethod`). It can cost performance and glitch
  during `react-native-screens` transitions; `blurReductionFactor` (default 4) tunes Android intensity to
  match iOS. Use `"none"` for a semi-transparent fallback on weak devices.
- Respect the user: `AccessibilityInfo.isReduceTransparencyEnabled()` (iOS) → a solid surface.
- Docs: https://docs.expo.dev/versions/latest/sdk/blur-view/

## Jetpack Compose (Android)

- Compose has no backdrop-filter. Use Chris Banes' Haze: `Modifier.hazeSource(state)` on the content behind,
  `Modifier.hazeEffect(state)` on the glass, styled with `HazeMaterials` (e.g. `HazeMaterials.thin()`).
  Haze 1.x called the effect modifier `hazeChild`; check the version you install.
- Real blur needs Android 12 (API 31, `RenderEffect`); below that, Haze falls back to a translucent scrim.
  Android's own window-blur guidance: 80px background blur for frosted glass, dim 0.1 with blur and 0.4
  without, never above 150px, and blur is off in battery saver.
- Docs: https://chrisbanes.github.io/haze/latest/ · https://source.android.com/docs/core/display/window-blurs

## The same rules, everywhere

- Light behind the glass, thickness by text amount, contrast measured over the brightest content, no glass
  on glass, a solid fallback for reduce-transparency and battery saver. The web checks (frost, contrast)
  have native equivalents in screenshot tests: capture over the brightest realistic content and measure.
