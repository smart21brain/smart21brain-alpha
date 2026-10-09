u2netp.onnx — U^2-Net (small) salient-object segmentation model, used by System21 Background Remover.
Source: https://github.com/xuebinqin/U-2-Net (Apache License 2.0), ONNX export as distributed by https://github.com/danielgatis/rembg
Runs fully in the browser through onnxruntime-web (MIT). To use another compatible model (e.g. silueta.onnx), put it here
and set window.SX_BG_CONFIG = { modelUrl: 'models/your-model.onnx' } before js/system21-bg.js loads.
