import type { ImageCredit, ProductImage } from "@/types";

/**
 * SAMPLE PHOTOGRAPHY (design development only).
 * All images are free-licence photographs from Pexels (https://www.pexels.com/license/),
 * served from the Pexels CDN. They are NOT Nargis & Shaz product photography and must be
 * replaced with the brand's own shoot before public launch. Full list: docs/IMAGE-CREDITS.md.
 *
 * Every product uses frames from ONE photographer's single shoot, so the primary and
 * alternate images always show the same garment.
 */

const PEXELS = "https://images.pexels.com/photos";

const photographers = {
  karina: { name: "Karina Karzhavina", profile: "https://www.pexels.com/@28488111/" },
  laura: { name: "Laura Chouette", profile: "https://www.pexels.com/@laurachouette/" },
  aleksey: { name: "Aleksey Vecherin", profile: "https://www.pexels.com/@107014568/" },
  serdi: { name: "Serdi Nam", profile: "https://www.pexels.com/@serdi/" },
  nataliya: { name: "Nataliya Vaitkevich", profile: "https://www.pexels.com/@n-voitkevich/" },
  danik: { name: "Danik Prihodko", profile: "https://www.pexels.com/@danikprihodko/" },
  alena: { name: "Alena Shekhovtcova", profile: "https://www.pexels.com/@alena-shekhovtcova/" },
  alexandra: { name: "Alexandra Kollstrem", profile: "https://www.pexels.com/@alexandra-kollstrem-77751824/" },
  rehman: { name: "Rehman Yousaf", profile: "https://www.pexels.com/@rehman-yousaf-321165099/" },
  dmitriy: { name: "Dmitriy Ganin", profile: "https://www.pexels.com/@ganinph/" },
  alican: { name: "Alican Helik", profile: "https://www.pexels.com/@alican-helik-362148343/" },
  konstantin: { name: "Konstantin Mishchenko", profile: "https://www.pexels.com/@aksioart/" },
  katrin: { name: "Katrin Bolovtsova", profile: "https://www.pexels.com/@ekaterina-bolovtsova/" },
  abhishek: { name: "Abhishek Kumar", profile: "https://www.pexels.com/@abhishek-kumar-100706288/" },
  simon: { name: "Simon Niogi", profile: "https://www.pexels.com/@chitrograntho/" },
  mart: { name: "MART PRODUCTION", profile: "https://www.pexels.com/@mart-production/" },
} as const;

type Who = keyof typeof photographers;

function credit(who: Who, id: number): ImageCredit {
  const p = photographers[who];
  return { source: "Pexels", photographer: p.name, photographerUrl: p.profile, sourceUrl: `https://www.pexels.com/photo/${id}/`, license: "Pexels License" };
}

/** [pexels id, file path after the id, alt text] — alt describes what is actually in the frame. */
type Frame = [number, string, string];

export function frames(who: Who, list: Frame[], orientation: "portrait" | "landscape" = "portrait"): ProductImage[] {
  return list.map(([id, file, alt]) => ({
    id: `px-${id}`,
    src: `${PEXELS}/${id}/${file}`,
    alt,
    width: orientation === "portrait" ? 4000 : 6000,
    height: orientation === "portrait" ? 6000 : 4000,
    credit: credit(who, id),
  }));
}

const jpg = (id: number) => `pexels-photo-${id}.jpeg`;

/* ───────────── Product shoots (one shoot per product) ───────────── */

export const shoots = {
  poplinShirt: frames("karina", [
    [7945663, jpg(7945663), "Close-up of the white poplin shirt worn tucked into ecru trousers with a black leather belt"],
    [7945548, jpg(7945548), "Model in the oversized white poplin shirt, seated against a pale studio wall"],
    [7945665, jpg(7945665), "Three-quarter view of the white poplin shirt with rolled sleeves"],
    [7945664, jpg(7945664), "Model adjusting the collar of the oversized white poplin shirt"],
    [7945542, jpg(7945542), "Relaxed seated pose in the white poplin shirt against a light backdrop"],
    [7945549, jpg(7945549), "Model seated on the studio floor in the white shirt and ecru trousers"],
  ]),
  pleatedTrousers: frames("karina", [
    [7945552, jpg(7945552), "Full-length view of the high-waisted ecru trousers with a white shirt and black belt"],
    [7945662, jpg(7945662), "Model standing in the ecru pleated trousers beside a studio light stand"],
    [7945666, jpg(7945666), "Full-length view of the ecru trousers against a dark grey backdrop"],
    [7945689, jpg(7945689), "Model in the ecru trousers and white shirt, standing in front of a paper backdrop"],
    [7945660, jpg(7945660), "Three-quarter view showing the drape of the ecru trousers"],
    [7945661, jpg(7945661), "Side view of the ecru trousers worn with a tucked white shirt"],
  ]),
  satinSlip: frames("laura", [
    [21904524, jpg(21904524), "Black and white portrait of the black satin slip dress with fine straps, model wearing a wide-brimmed hat"],
    [21904498, "pexels-photo-21904498/free-photo-of-black-and-white-photo-of-a-woman-wearing-a-black-dress-and-covering-her-face-with-a-hand-fan.jpeg", "Model in the black satin slip dress holding a folding fan in front of her face"],
    [21904525, "pexels-photo-21904525/free-photo-of-black-and-white-photography-of-a-woman-covering-her-face-with-a-hand-fan.jpeg", "Three-quarter view of the bias-cut black satin slip dress"],
    [21904513, "pexels-photo-21904513/free-photo-of-black-and-white-photography-of-a-woman-covering-her-face-with-a-hand-fan.jpeg", "Black satin slip dress photographed in black and white, hand on hip"],
    [21904504, "pexels-photo-21904504/free-photo-of-black-and-white-photography-of-a-woman-covering-her-face-with-a-hand-fan.jpeg", "Side profile in the black satin slip dress and wide hat"],
    [21904521, "pexels-photo-21904521/free-photo-of-model-in-nightie-posing-with-fan-in-black-and-white.jpeg", "Full-length view of the black satin slip dress with a folding fan"],
  ]),
  satinGown: frames("aleksey", [
    [9563091, jpg(9563091), "Model lifting the skirt of the blush satin gown in a white studio"],
    [9563074, jpg(9563074), "Full-length view of the blush satin gown with the skirt in motion"],
    [9563085, jpg(9563085), "The blush satin gown with a plunging neckline, skirt swept out to one side"],
    [9563080, jpg(9563080), "Front view of the blush satin gown with a deep V neckline"],
    [9563076, jpg(9563076), "Blush satin gown with the fabric gathered in both hands"],
    [9563094, jpg(9563094), "Full-length blush satin gown, arms raised, in a white studio"],
  ]),
  satinMaxi: frames("serdi", [
    [16159325, "pexels-photo-16159325/free-photo-of-model-in-satin-dress-and-turban.jpeg", "Model in the long-sleeved dusty rose satin maxi dress with a matching head wrap"],
    [16159326, "pexels-photo-16159326/free-photo-of-woman-wearing-a-pink-dress.jpeg", "Seated view of the dusty rose satin maxi dress against a dark backdrop"],
    [16159327, "pexels-photo-16159327/free-photo-of-woman-wearing-a-dress-sitting-on-a-chair.jpeg", "Dusty rose satin maxi dress, model seated on a wooden stool"],
    [16159328, "pexels-photo-16159328/free-photo-of-woman-posing-in-pink-dress.jpeg", "Three-quarter view of the dusty rose satin dress with full sleeves"],
    [16140771, jpg(16140771), "Full-length view of the dusty rose satin maxi dress in a dark studio"],
  ]),
  trench: frames("nataliya", [
    [4456717, jpg(4456717), "Full-length view of the classic beige trench coat, belted, in a pale studio"],
    [4456719, jpg(4456719), "Close-up of the beige trench coat collar and lapels"],
    [4456727, jpg(4456727), "Model seated in the beige trench coat beside a plant"],
    [4456733, jpg(4456733), "Front view of the double-breasted beige trench coat"],
    [4456715, jpg(4456715), "Beige trench coat worn open, three-quarter view"],
    [4456721, jpg(4456721), "Model with hands in the pockets of the beige trench coat"],
  ]),
  coatSet: frames("danik", [
    [15759098, jpg(15759098), "Model in the ivory longline coat and matching trousers, seated on the studio floor"],
    [15759111, "pexels-photo-15759111/free-photo-of-woman-in-sunglasses-sitting-on-chair-in-studio.jpeg", "Ivory coat and trouser set worn with sunglasses, seated on a chair"],
    [15759100, "pexels-photo-15759100/free-photo-of-woman-in-trench-coat-and-sunglasses-sitting-on-floor.jpeg", "Relaxed seated pose in the ivory longline coat set against a dark backdrop"],
    [15759115, "pexels-photo-15759115/free-photo-of-woman-in-sunglasses-sitting-on-chair-in-studio.jpeg", "Ivory coat and trouser set, model leaning forward on a chair"],
    [15759104, "pexels-photo-15759104/free-photo-of-woman-in-trench-coat-and-sunglasses-posing-indoors.jpeg", "Full view of the ivory longline coat set in a dark studio"],
  ]),
  turtleneck: frames("alena", [
    [6995884, jpg(6995884), "Model pulling the high neck of the oatmeal chunky-knit turtleneck up to her chin"],
    [6995886, jpg(6995886), "Close-up of the chunky rib knit of the oatmeal turtleneck"],
    [6995898, jpg(6995898), "Oatmeal turtleneck jumper with long sleeves, studio portrait"],
    [6995900, jpg(6995900), "Three-quarter view of the relaxed oatmeal turtleneck"],
    [6995902, jpg(6995902), "Close-up of the oversized collar of the oatmeal turtleneck"],
    [6995880, jpg(6995880), "Model wrapped in the oatmeal turtleneck, sleeves pulled over the hands"],
  ]),
  blazer: frames("alexandra", [
    [8958833, jpg(8958833), "Model in the black oversized tailored blazer against a blush backdrop"],
    [8958840, jpg(8958840), "Three-quarter view of the black single-breasted blazer"],
    [8958834, jpg(8958834), "Black tailored blazer with peak lapels, worn open"],
    [8958839, jpg(8958839), "Close-up of the shoulder and lapel of the black blazer"],
    [8958830, jpg(8958830), "Model reclining on the studio floor in the black blazer"],
    [8958842, jpg(8958842), "Black oversized blazer, model with one hand at the lapel"],
  ]),
  cottonMaxi: frames("rehman", [
    [13816061, jpg(13816061), "Full-length view of the ivory cotton maxi dress with long sleeves"],
    [13816064, jpg(13816064), "Ivory cotton maxi dress, model turning to the side"],
    [13816066, jpg(13816066), "Front view of the ivory maxi dress with a gathered waist"],
    [13816068, jpg(13816068), "Ivory cotton maxi dress in a white studio, hand on hip"],
    [13816060, jpg(13816060), "Three-quarter view of the long ivory dress"],
  ]),
  linenDress: frames("dmitriy", [
    [7789139, jpg(7789139), "Model in the olive linen shirt dress standing by a linen backdrop"],
    [7789137, jpg(7789137), "Olive linen shirt dress worn with a woven basket"],
    [7789140, jpg(7789140), "Full-length view of the olive linen shirt dress"],
    [7789143, jpg(7789143), "Model seated in the olive linen dress"],
    [7789141, jpg(7789141), "Woven basket of white linen held against the olive linen dress"],
  ]),
  printedSkirt: frames("alican", [
    [17805851, jpg(17805851), "Model in the dark printed midi skirt and white top on a country road"],
    [17805843, "pexels-photo-17805843/free-photo-of-woman-pulling-chair-on-dirt-road.jpeg", "Printed midi skirt in motion as the model walks along a dirt road"],
    [17805846, "pexels-photo-17805846/free-photo-of-model-holding-a-chair-on-a-dirt-road-through-the-fields.jpeg", "Full-length view of the printed midi skirt in golden fields"],
    [17805836, "pexels-photo-17805836/free-photo-of-model-in-a-white-sweater-and-hat-looking-down-at-her-feet-on-a-dirt-road.jpeg", "Printed midi skirt worn with a white sweater and hat"],
    [17805903, "pexels-photo-17805903/free-photo-of-model-in-a-white-sweater-and-fedora-standing-with-a-chair-on-a-dirt-road.jpeg", "Model standing with a wooden chair, wearing the printed midi skirt"],
    [17805914, "pexels-photo-17805914/free-photo-of-model-in-a-white-sweater-and-fedora-looking-at-the-fields.jpeg", "Printed midi skirt with a fedora, looking out over the fields"],
  ]),
  pleatedSkirt: frames("konstantin", [
    [4690504, jpg(4690504), "Ivory pleated midi skirt worn with a printed blouse against a dark backdrop"],
    [4690501, jpg(4690501), "Movement of the knife-pleated ivory midi skirt"],
    [4690507, jpg(4690507), "Full-length view of the ivory pleated skirt"],
    [4690511, jpg(4690511), "Model seated in the ivory pleated skirt in an armchair"],
    [4690509, jpg(4690509), "Ivory pleated midi skirt fanned out across a chair"],
  ]),
  linenBlouse: frames("katrin", [
    [5393448, jpg(5393448), "Model in the white linen blouse arranging dried flowers"],
    [5393440, jpg(5393440), "White linen blouse with full sleeves, three-quarter view"],
    [5393449, jpg(5393449), "White linen blouse tucked into a brown skirt"],
    [5393451, jpg(5393451), "Model seated in the white linen blouse beside a vase"],
    [5393442, jpg(5393442), "Side view of the white linen blouse with a relaxed shoulder"],
  ]),
  lehenga: frames("abhishek", [
    [9418537, jpg(9418537), "Ivory and gold embroidered lehenga with a sheer dupatta draped over one arm"],
    [9418855, jpg(9418855), "Full-length view of the ivory zari lehenga skirt and blouse"],
    [9418564, jpg(9418564), "Ivory and gold lehenga with the dupatta held open"],
  ]),
  bridal: frames("simon", [
    [20790056, "pexels-photo-20790056/free-photo-of-portrait-of-indian-woman-in-traditional-clothing-and-jewelry.jpeg", "Model in the maroon embroidered choli with a beige dupatta and traditional jewellery"],
    [20790059, "pexels-photo-20790059/free-photo-of-model-in-traditional-red-choli-blouse-and-jewelry.jpeg", "Close-up of the embroidered maroon choli blouse"],
    [20790054, "pexels-photo-20790054/free-photo-of-model-in-a-red-choli-blouse-and-beige-scarf.jpeg", "Maroon choli worn with the beige embroidered dupatta"],
    [20790058, "pexels-photo-20790058/free-photo-of-smiling-woman-in-traditional-indian-attire.jpeg", "Portrait in the maroon bridal set and gold jewellery"],
    [20790061, jpg(20790061), "Three-quarter view of the maroon bridal choli set"],
    [20790053, "pexels-photo-20790053/free-photo-of-woman-sitting-in-traditional-clothing.jpeg", "Full-length seated view of the maroon bridal lehenga against a red backdrop"],
  ]),
  sageSuit: frames("mart", [
    [8433559, jpg(8433559), "Model in the sage two-piece suit seated on a cognac leather sofa"],
    [8433542, jpg(8433542), "Full-length view of the sage tailored suit in a sunlit room"],
    [8433393, jpg(8433393), "Model reclining on a leather sofa in the sage suit"],
    [8433356, jpg(8433356), "Sage suit with a relaxed blazer, model seated on a sofa"],
  ]),
};

/* ───────────── Campaign & editorial imagery ───────────── */

export const campaign = {
  heroWide: frames("mart", [[8433535, jpg(8433535), "Woman in a sage tailored suit seated on a cognac leather sofa in a sunlit loft with tall plants"]], "landscape")[0],
  heroPortrait: frames("mart", [[8433356, jpg(8433356), "Woman in a sage tailored suit seated on a leather sofa in soft daylight"]])[0],
  loftWide: frames("mart", [[8433588, jpg(8433588), "Sunlit loft with a cognac sofa and a woman in a sage suit, plants by the window"]], "landscape")[0],
  loftClose: frames("mart", [[8433607, jpg(8433607), "Woman in a sage suit leaning against a leather sofa in warm light"]], "landscape")[0],
  fields: frames("alican", [[17805846, "pexels-photo-17805846/free-photo-of-model-holding-a-chair-on-a-dirt-road-through-the-fields.jpeg", "Woman in a white top and midi skirt carrying a wooden chair through golden fields"]])[0],
  fan: frames("laura", [[21926474, "pexels-photo-21926474/free-photo-of-dancer-hiding-her-face-behind-a-hand-fan.jpeg", "Black and white image of a woman in a black satin dress hiding behind a folding fan"]])[0],
  gownMotion: frames("aleksey", [[9563093, jpg(9563093), "Woman in a blush satin gown, fabric in motion against a white wall"]])[0],
  trenchSeated: frames("nataliya", [[4456727, jpg(4456727), "Woman in a beige trench coat seated beside a plant in a pale room"]])[0],
  blazerFloor: frames("alexandra", [[8958830, jpg(8958830), "Woman in a black tailored blazer reclining against a blush backdrop"]])[0],
  bridalMoon: frames("simon", [[20790053, "pexels-photo-20790053/free-photo-of-woman-sitting-in-traditional-clothing.jpeg", "Woman in a maroon embroidered bridal lehenga seated before a glowing red circle"]])[0],
  knitDetail: frames("alena", [[6995886, jpg(6995886), "Close-up of a chunky oatmeal rib knit"]])[0],
  shirtDetail: frames("karina", [[7945663, jpg(7945663), "Close-up of a white poplin shirt tucked into ecru trousers with a black belt"]])[0],
  lehengaDetail: frames("abhishek", [[9418564, jpg(9418564), "Ivory and gold zari embroidery on a lehenga and sheer dupatta"]])[0],
};
