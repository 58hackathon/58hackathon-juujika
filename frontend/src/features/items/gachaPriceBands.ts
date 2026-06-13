export type GachaPriceBand = {
  minPrice: number;
  maxPrice?: number;
  label: string;
};

const priceBands: GachaPriceBand[] = [
  { minPrice: 0, maxPrice: 999, label: "〜¥999" },
  { minPrice: 1000, maxPrice: 2999, label: "¥1,000〜¥2,999" },
  { minPrice: 3000, maxPrice: 4999, label: "¥3,000〜¥4,999" },
  { minPrice: 5000, maxPrice: 9999, label: "¥5,000〜¥9,999" },
  { minPrice: 10000, maxPrice: 19999, label: "¥10,000〜¥19,999" },
  { minPrice: 20000, maxPrice: 49999, label: "¥20,000〜¥49,999" },
  { minPrice: 50000, label: "¥50,000〜" },
];

export function getGachaPriceBand(price: number): GachaPriceBand {
  return (
    priceBands.find(
      (band) =>
        price >= band.minPrice &&
        (band.maxPrice === undefined || price <= band.maxPrice)
    ) ?? priceBands[0]
  );
}
