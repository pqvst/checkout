module.exports = {

  mode: 'production',

  entry: './client/index.js',

  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['.ts', '.js'],
  },

  output: {
    filename: 'checkout.js',
  },

  module: {
    rules: [
      {
        test: /\.pug$/,
        use: [
          'raw-loader',
          'pug-plain-loader'
        ]
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            sourceType: 'unambiguous',
            presets: [
              ['@babel/preset-env', { useBuiltIns: 'usage', corejs: '3' }]
            ]
          }
        }
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },

};
