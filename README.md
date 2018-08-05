# bps.js

Apply [BPS] patches, like the kind you'd use for a ROM hack.

## Installation

```bash
yarn global add bps.js
```

## Usage

### Command line

```bash
# Applying a patch
bps apply clean.rom patch.bps changed.rom
```

### JavaScript

Note: All files are expected to be `Buffer` instances.

```js
import { applyBpsPatch } from 'bps.js';

// Applying a patch
const targetFile = applyBpsPatch(sourceFile, patchFile);
```

## License

ISC © [Keith McKnight](https://keith.mcknig.ht)

[BPS]: https://www.romhacking.net/documents/746/
