module.exports = {
  plugins: [
    "sortAttrs",
    {
      name: "removeAttrs",
      params: {
        attrs: "fill",
      },
    },
    {
      name: "addAttributesToSVGElement",
      params: {
        attributes: ['fill="currentColor"'],
      },
    },
  ],
};
