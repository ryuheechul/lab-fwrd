<script lang="ts">
  import { start } from '../adapters/traffic-lights';

  let light = '';

  start((_light) => {
    light = _light;
  });
</script>

<h4>Using traffic-light machine to observe the current state</h4>

{light}
