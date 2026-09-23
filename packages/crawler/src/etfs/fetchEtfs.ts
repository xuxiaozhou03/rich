const trackingIndexBlackList = ["短融", "城投", "债", "信用"];

interface OriginalEtf {
  securityName: string;
  securityCode: string;
  scale: number;
  trackingIndex: string | null;
  trackIndex: string | null;
}
export const fetchEtfs = async () => {
  const res = await fetch(
    "https://hongsehuojian.com/fundex-quote/allPage/findListByEtf?classA=&classB=&orderBy=l.scale&order=desc&searchValue=&isSelected=&pageNo=1&pageSize=2000&position=",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        pragma: "no-cache",
        pro: "RedRocket-PC",
        "sec-ch-ua":
          '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      body: null,
      method: "GET",
    },
  );
  const ret = (await res.json()) as {
    data: {
      data: OriginalEtf[];
    };
  };

  const data = ret.data.data
    // 过滤掉没有跟踪指数的 ETF
    .filter((etf) => etf.trackingIndex)
    // 过滤掉规模小于 3 亿的 ETF
    .filter((etf) => etf.scale >= 300_000_000)
    // 过滤 trackingIndex 黑名单
    .filter(
      (etf) =>
        !trackingIndexBlackList.find((item) =>
          etf.trackingIndex?.includes(item),
        ),
    )
    .map((etf) => ({
      securityName: etf.securityName,
      securityCode: etf.securityCode,
      scale: etf.scale,
      trackingIndex: etf.trackingIndex,
      trackIndex: etf.trackIndex,
    }));

  // 同一跟踪标的的 ETF 只保留规模最大的一个
  const grouped = data.reduce(
    (acc, etf) => {
      const key = etf.trackingIndex!;

      if (!acc[key] || acc[key].scale < etf.scale) {
        acc[key] = etf;
      }
      return acc;
    },
    {} as Record<string, OriginalEtf>,
  );
  const list = Object.values(grouped);
  return list;
};
