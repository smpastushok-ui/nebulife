# Debug Changes to Revert

## File: `packages/client/src/App.tsx`

### 1. Remove `calculateObservation` import
In the import block from `@nebulife/core`, remove `calculateObservation,`

### 2. Remove debug unlock block
Remove the entire block between `// DEBUG:` and `// END DEBUG` comments in the `engine.init().then()` callback.

The block to remove starts with:
```
// DEBUG: unlock all systems for testing (remove after testing)
```
and ends with:
```
// END DEBUG
```

After removing, the init should look like:
```typescript
engine.init().then(() => {
  engineRef.current = engine;
  engine.setResearchState(researchState);
}).catch((err) => {
```
