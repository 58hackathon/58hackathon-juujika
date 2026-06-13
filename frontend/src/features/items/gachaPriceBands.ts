export type GachaPriceBand = {
  minPrice: number;
  maxPrice?: number;
  label: string;
};

const priceBandSize = 3000;

export function getGachaPriceBand(price: number): GachaPriceBand {
  const normalizedPrice = Math.max(0, Math.floor(price));
  const minPrice =
    Math.floor(normalizedPrice / priceBandSize) * priceBandSize;
  const maxPrice = minPrice + priceBandSize - 1;

  return {
    minPrice,
    maxPrice,
    label:
      minPrice === 0
        ? `〜¥${formatPrice(maxPrice)}`
        : `¥${formatPrice(minPrice)}〜¥${formatPrice(maxPrice)}`,
  };
}

function formatPrice(price: number): string {
  return price.toLocaleString("ja-JP");
}
