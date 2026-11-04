# Recipe 12a: When to use WebGL glass instead

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

CSS glass covers flat UI surfaces. Use WebGL only when the glass is a 3D object (a lens, a bottle, a
logo) or the backdrop is already a WebGL scene; every transmissive mesh renders the scene a second time per
frame. With react-three-fiber, drei's `MeshTransmissionMaterial` is the usual choice. Its defaults are
transmission 1, thickness 0, roughness 0, chromaticAberration 0.03, samples 6, full-screen resolution;
a frosted starting point is:

```tsx
<MeshTransmissionMaterial resolution={256} samples={6} thickness={0.5} roughness={0.2} chromaticAberration={0.03} anisotropicBlur={0.1} backside={false} />
```

- Lower `resolution` is the main speed lever; with roughness, 32–128 still looks right. `backside` costs
  another pass. In plain three.js, `MeshPhysicalMaterial` with `transmission: 1, thickness: 0.5,
  roughness: 0.2, ior: 1.5` is the equivalent.
- Docs: https://drei.docs.pmnd.rs/shaders/mesh-transmission-material
