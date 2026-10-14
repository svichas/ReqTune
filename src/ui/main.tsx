import '@mantine/core/styles.css';
import './global.css';
import { ActionIcon, MantineProvider, Menu, Switch, Tooltip, createTheme, mergeThemeOverrides } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { brandCssVariables, brandTheme } from './brand';

// Component defaults only; palette, type and shape come from the brand theme.
const uiTheme = createTheme({
  respectReducedMotion: true,
  components: {
    // Mantine tooltips open on hover only by default; icon-only buttons need them on keyboard focus too.
    Tooltip: Tooltip.extend({ defaultProps: { events: { hover: true, focus: true, touch: true }, openDelay: 400 } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { variant: 'subtle', color: 'gray' } }),
    Switch: Switch.extend({ defaultProps: { withThumbIndicator: false } }),
    // Mantine pads menu items with spacing tokens, which the brand's 4px grid makes too tight for a pointer target.
    Menu: Menu.extend({ styles: { item: { padding: '6px 10px' }, itemSection: { marginInlineEnd: 8 } } }),
  },
});

createRoot(document.getElementById('root')!).render(
  <MantineProvider
    theme={mergeThemeOverrides(brandTheme, uiTheme)}
    cssVariablesResolver={brandCssVariables}
    defaultColorScheme="auto"
  >
    <App />
  </MantineProvider>,
);
