<script lang="ts">
	import { onMount } from 'svelte';
	import { Babylon } from './babylon';

	let canvas: HTMLCanvasElement;

	onMount(async () => {
		new Babylon(canvas).run();
	});
</script>

<main>
	<canvas bind:this={canvas} id="canvas" />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
		padding: 0;
		margin: 0;
	}
	canvas {
		width: 100%;
		height: 100%;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
