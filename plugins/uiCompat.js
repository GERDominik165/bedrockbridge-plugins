/**
 * uiCompat.js — Kompatibilitäts-Shim für @minecraft/server-ui (beta 2.x).
 *
 * In beta-2.x nehmen ModalFormData .toggle/.textField/.dropdown/.slider ein
 * Options-OBJEKT statt positionaler Default-Werte. Viele (ältere) Plugins nutzen
 * noch die alte positionale Form -> "Native type conversion failed" beim Bauen.
 * Dieser Shim patcht die Prototyp-Methoden EINMAL so, dass BEIDE Formen gehen.
 * Muss VOR allen UI-Plugins in index.js importiert werden.
 */
import { ModalFormData } from "@minecraft/server-ui";

const P = ModalFormData.prototype;
if (!P.__tnUiCompat) {
  P.__tnUiCompat = true;

  const _toggle = P.toggle;
  P.toggle = function (label, opt) {
    if (typeof opt === "boolean") opt = { defaultValue: opt };
    return _toggle.call(this, label, opt);
  };

  const _textField = P.textField;
  P.textField = function (label, placeholder, opt, extra) {
    // alt: textField(label, placeholder, defaultValue)
    if (typeof opt === "string") opt = { defaultValue: opt };
    return _textField.call(this, label, placeholder, opt);
  };

  const _dropdown = P.dropdown;
  P.dropdown = function (label, items, opt) {
    // alt: dropdown(label, items, defaultIndex)
    if (typeof opt === "number") opt = { defaultValueIndex: opt };
    return _dropdown.call(this, label, items, opt);
  };

  const _slider = P.slider;
  P.slider = function (label, min, max, a, b) {
    // alt: slider(label, min, max, step, defaultValue)
    if (typeof a === "number" || typeof b === "number") {
      const opt = {};
      if (typeof a === "number") opt.valueStep = a;
      if (typeof b === "number") opt.defaultValue = b;
      a = opt;
    }
    return _slider.call(this, label, min, max, a);
  };

  console.warn("[uiCompat] ModalFormData alt<->neu Signatur-Shim aktiv");
}
