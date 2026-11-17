# Calculation methodology

All calculations use unrounded internal JavaScript numbers. UI values are rounded for display; CSV retains numerical results. No explicit significant-figure policy is imposed on researchers.

## 1. Binder and absolute-volume calculation

Let `B` be dry binder mass in kg, `f_i` the mass fraction of component i (fractions sum to 1) and `rho_i` its density in kg/m³. The additional ratios are masses per kg binder: `w` added water, `s` SSD sand, `a` SSD coarse aggregate and `l` additional liquid. Water density is fixed at 1000 kg/m³; other densities are editable. Let `e` be entrapped/entrained air as a fraction of gross fresh volume.

```
C = sum(f_i / rho_i) + w/1000 + s/rho_s + a/rho_a + l/rho_l   [m³/kg binder]
B = (V_L / 1000) * (1 - e) / C                             [kg]
V_L = B * C / (1 - e) * 1000                              [L]
component_i = B * f_i                                     [kg]
added_water = B * w; sand = B * s; coarse = B * a; liquid = B * l
with_waste = base_mass * (1 + waste_percent/100)
```

The target volume is net planned fresh material before waste. Air is accounted for in volume, not as material mass. Waste applies once to every ingredient. The binder-mass basis uses the entered B and computes the corresponding theoretical fresh volume. Actual yield still requires laboratory verification.

Independent check: 50/50 binder, both densities 2000 kg/m³; w=0.5, s=2, sand density=2000, no coarse/liquid/air. `C=0.0005+0.0005+0.001=0.002`. For 10 L, B=5 kg. Binder components=2.5 kg each, water=2.5 kg, sand=10 kg. Total=17.5 kg; 10% waste=19.25 kg. With 10% air at the same gross target, B=4.5 kg.

Cement replacement is `100 - sum(cement component percentages)`. If no cement component has a positive fraction, the value is N/A. This is a mass fraction, not a carbon assessment.

## 2. Specimens and groups

```
Cube = side³
Rectangular prism = length * width * height
Cylinder = pi * diameter² * height / 4
Steel displacement = pi * rod_diameter² * embedded_length / 4
Net matrix L = (gross mm³ - steel mm³) / 1,000,000
Estimated matrix kg = net L / 1000 * assumed fresh density kg/m³
```

The rod is assumed parallel to specimen height (cube: side). It must fit in the cross-section and must not exceed that axial dimension. Position, cover and electrical exposure length suitability remain laboratory design issues. Steel mass is not included in cementitious batch quantities.

Three 50 mm cubes need `3*50³/1e6=0.375 L`. At 2200 kg/m³, their estimated matrix mass is 0.825 kg. A 100 mm diameter, 200 mm high cylinder is pi/2 L. A 25×25×285 mm prism is 0.178125 L.

For destructive testing: specimen count = quantity per age × number of ages. For repeated monitoring: specimen count = quantity once. Group volumes sum by saved mix. Each mix's waste allowance then applies once to its aggregate volume calculation. Ages are user-defined, not a prescribed standard schedule.

## 3. Calculated laboratory results

| Result | Formula | Required units |
| --- | --- | --- |
| Compressive strength | load × 1000 / loaded area | kN / mm² -> MPa |
| Mass change | 100 × (final − initial) / initial | Same positive mass units; final can be zero |
| Length change | 100 × (corrected final − corrected initial) / gauge length | All mm -> % |
| Water absorption | 100 × (saturated − dry) / dry | Same mass units -> % |
| Corrosion current density | current magnitude / exposed steel area | µA / cm² -> µA/cm² |

Strength: 100 kN / 2500 mm² = 40 MPa. Mass change: 1000 to 995 g = −0.5%. Length change: 0.25 mm / 250 mm = 0.1%. Absorption: 1000 to 1050 g = 5%. Current density: 2 µA / 10 cm² = 0.2 µA/cm².

Length readings must already be corrected for the comparator reference as required by the chosen protocol. A generic formula does not implement temperature, saturation, conditioning or calibration requirements. Applied current in accelerated testing is not automatically the corrosion current for this formula.

## 4. Statistics and comparisons

```
mean = sum(x) / n
sample SD = sqrt(sum((x-mean)²) / (n-1))    for n >= 2
percent change = 100 * (value - baseline) / baseline
```

SD is null/undefined for n=1. Percent change is undefined for a zero baseline. Potential comparisons use differences only, not percentages of an electrode-relative potential.

Groups retain mix, indicator, age, cycle, units, exposure, phase, method, electrode and sample/experimental origin. A matching control group must satisfy the same selected conditions and age/cycle. Sample SD characterises the entered group; it is not a significance test. For technical repeats or repeated measurements, design a suitable aggregation or statistical model outside the app before treating them as independent replicates.

For [10,12,14], mean=12 and sample SD=2. These hand-check values are in the test suite.

## 5. Exploratory corrosion screening

Select the exposed condition, a control mix and control exposure. Within the selected phase, method, reference electrode and origin, pair each exposed reading to controls with exactly the same age and integer cycle. Average all eligible controls.

`delta_E = exposed potential - mean eligible control potential`

A reading qualifies if `delta_E <= -user_threshold_mV`. The chosen number of consecutive integer cycles produces a candidate shift. Missing controls, missing cycle IDs, skipped cycles and nonqualifying observations break a run. The first qualifying observation in the earliest completed run is its start; completion is reported separately. Dates are not interpolated.

The default 100 mV/3 cycles is an illustrative software setting, not an ASTM criterion or validated initiation threshold. Corrosion monitoring requires complementary evidence. Potential-electrode conversion is not automated.
