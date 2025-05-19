export default {
  presets: [
    ['./config/babel/preset', {
      modules: false,
      targets: 'node >= 20',
    }],
  ],
};
