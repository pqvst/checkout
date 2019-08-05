module.exports = {

  mode: 'production',

  entry: './client/index.js',
  
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    }
  },

  output: {
    filename: 'checkout.min.js',
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
            presets: [
              ['@babel/preset-env', { useBuiltIns: 'usage', corejs: '3' }]
            ]
          }
        }
      },
    ]
  },

};
