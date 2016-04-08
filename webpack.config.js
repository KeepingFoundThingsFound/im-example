module.exports = {
  entry: "./app/entry.js",
  output: {
    path: __dirname,
    filename: "./app/bundle.js"
  },
  devtool: "source-map",
  module: {
    loaders: [
      // Automatically load any .css file as CSS when we use require
      { test: /\.css$/, loader: "style!css" }
    ]
  }
}
