export const tiers = [
  {
    name: "Free",
    id: "free",
    priceMonthly: "0",
    priceAnually: "0",
    description: "Perfect for sharing videos between friends",
    features: [
      {
        text: "3GB of storage space",
        infoTip:
          "Storage space is determined by the size of the uploaded video file. We will automatically create a seperate transcoded version of the video to ensure it is viewable on all devices with no extra space used on your account.",
      },
      {
        text: "512mb max size per video",
      },
      {
        text: "Upload 3 videos each day",
      },
      {
        text: "Native video quality",
        infoTip:
          "We retain and give you the ability to view the native video file you uploaded at any time. Upgrade to a paid tier to have mutliple video qualities available",
      },
      {
        text: "Basic analytics",
        infoTip: "Basic analytics includes total views on a video",
      },
      {
        text: "100 day video retention",
        infoTip: "Videos will be automatically deleted after 100 days",
      },
      {
        text: "Private and unlisted videos",
        infoTip:
          'Unlisted videos are not searchable and can only be viewed by those with the link. Private videos are only viewable by the owner. "Public" video with the typical definition are not apart of Flowble.',
      },
    ],
  },
  {
    name: "Pro",
    id: "pro",
    monthlyPaymentLink: "https://pay.flowble.app/b/aEU16U4CQdRP80w8wE",
    annualPaymentLink: "https://pay.flowble.app/b/14k02Qedq00Z0y44gp",
    priceMonthly: "4",
    priceAnually: "40",
    description: "Great for anyone who needs more storage",
    features: [
      { text: "Everything in Free Tier" },
      { text: "100GB of storage space" },
      { text: "Infinite video retention" },
      { text: "Multiple qualities for each video" },
      { text: "Ad-free experience" },
      { text: "Upload 12 videos each day" },
    ],
  },
  {
    name: "Premium",
    id: "premium",
    monthlyPaymentLink: "https://pay.flowble.app/b/14k7vib1e00Za8E14a",
    annualPaymentLink: "https://pay.flowble.app/b/4gw8zm0mA5lja8E6oy",
    priceMonthly: "12",
    priceAnually: "120",
    description: "For professionals looking to reach everyone",
    features: [
      { text: "Everything in Pro Tier" },
      { text: "800GB of storage space" },
      {
        text: "Higher quality processed videos",
        infoTip: "The additional quality levels of your video we process will be a higher quality.",
      },
      { text: "No daily video upload limit" },
    ],
  },
];
