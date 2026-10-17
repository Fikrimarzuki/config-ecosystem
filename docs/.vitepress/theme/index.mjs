import DefaultTheme from 'vitepress/theme';
import EcosystemHome from './EcosystemHome.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('EcosystemHome', EcosystemHome);
  },
};
