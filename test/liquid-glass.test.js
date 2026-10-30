const test = require("node:test");
const assert = require("node:assert/strict");
const { makeContext, ENGINE_FILES } = require("./load");

// 假 canvas：只记下 putImageData 收到的像素，好检查位移贴图
function setup() {
  const ctx = makeContext(ENGINE_FILES);
  ctx.sandbox.document.createElement = () => ({
    getContext: () => ({
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (img) => { ctx.sandbox.__img = img; },
    }),
    toDataURL: () => "data:image/png;base64,",
  });
  return ctx;
}
const px = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1]]; };

test("折射曲线：玻璃外沿偏得最多，斜面内沿归零，中间单调递减", () => {
  const prof = setup().run("Array.from(lgProfile())");
  assert.equal(prof.length, 129);
  assert.equal(Math.max(...prof), prof[0]);
  assert.ok(prof[0] > 0.99);
  assert.ok(prof[128] < 1e-6);
  for (let i = 1; i < prof.length; i++) assert.ok(prof[i] <= prof[i - 1] + 1e-9, `not monotonic at ${i}`);
});

test("位移贴图：中间不动，四条边沿法线朝外取样，圆角外面不动", () => {
  const ctx = setup();
  ctx.run("lgMapUrl(120, 40, 20, 20)");
  const img = ctx.sandbox.__img;
  assert.deepEqual(px(img, 60, 20), [128, 128]);
  const [lR] = px(img, 0, 20), [rR] = px(img, 119, 20);
  assert.ok(lR < 60 && rR > 196, `edges ${lR} ${rR}`);
  const [, topG] = px(img, 60, 0), [, botG] = px(img, 60, 39);
  assert.ok(topG < 60 && botG > 196, `top/bottom ${topG} ${botG}`);
  assert.deepEqual(px(img, 0, 0), [128, 128]); // 圆角之外
});

test("同尺寸同圆角的玻璃共用一个滤镜", () => {
  const ctx = setup();
  const nodes = [];
  ctx.sandbox.document.createElementNS = () => ({ style: {}, setAttribute() {}, appendChild(n) { nodes.push(n); }, remove() {} });
  ctx.sandbox.document.body.appendChild = () => {};
  const a = ctx.run("lgFilterId(120, 40, 20)"), b = ctx.run("lgFilterId(120, 40, 20)"), c = ctx.run("lgFilterId(121, 40, 20)");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(nodes.length, 2);
});
