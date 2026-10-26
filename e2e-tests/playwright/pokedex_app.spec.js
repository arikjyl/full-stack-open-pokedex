import { test, expect } from '@playwright/test';

const pokemonList = [
  { id: 1, name: 'bulbasaur' },
  { id: 2, name: 'ivysaur' },
  { id: 3, name: 'venusaur' },
];

const pokemonDetails = {
  bulbasaur: {
    name: 'bulbasaur',
    abilities: [
      { ability: { name: 'overgrow' }, is_hidden: false },
      { ability: { name: 'chlorophyll' }, is_hidden: true },
    ],
    stats: [
      { base_stat: 45, stat: { name: 'hp' } },
      { base_stat: 49, stat: { name: 'attack' } },
    ],
    types: [{ slot: 1, type: { name: 'grass' } }],
    sprites: { front_default: 'https://example.com/bulbasaur.png' },
  },
  ivysaur: {
    name: 'ivysaur',
    abilities: [{ ability: { name: 'overgrow' }, is_hidden: false }],
    stats: [{ base_stat: 60, stat: { name: 'hp' } }],
    types: [{ slot: 1, type: { name: 'grass' } }],
    sprites: { front_default: 'https://example.com/ivysaur.png' },
  },
  venusaur: {
    name: 'venusaur',
    abilities: [{ ability: { name: 'overgrow' }, is_hidden: false }],
    stats: [{ base_stat: 80, stat: { name: 'hp' } }],
    types: [{ slot: 1, type: { name: 'grass' } }],
    sprites: { front_default: 'https://example.com/venusaur.png' },
  },
};

const pokemonListResponse = {
  results: pokemonList.map(({ id, name }) => ({
    name,
    url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
  })),
};

async function mockPokeApi(page, { failList = false, failPokemon } = {}) {
  await page.route(
    /^https:\/\/pokeapi\.co\/api\/v2\/pokemon(?:\/.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      const name = url.pathname.split('/').filter(Boolean).pop();

      if (url.searchParams.has('limit')) {
        if (failList) {
          await route.fulfill({ status: 500, body: 'List request failed' });
          return;
        }
        await route.fulfill({ json: pokemonListResponse });
        return;
      }

      if (name === failPokemon) {
        await route.fulfill({ status: 500, body: 'Pokemon request failed' });
        return;
      }

      const pokemon = pokemonDetails[name];
      if (!pokemon) {
        await route.fulfill({ status: 404, body: 'Pokemon not found' });
        return;
      }
      await route.fulfill({ json: pokemon });
    },
  );
}

test.describe('Pokedex', () => {
  test('front page can be opened', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('ivysaur')).toBeVisible();
    await expect(
      page.getByText(
        'Pokémon and Pokémon character names are trademarks of Nintendo.',
      ),
    ).toBeVisible();
  });

  test('shows the Pokémon list', async ({ page }) => {
    await mockPokeApi(page);
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'bulbasaur' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ivysaur' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'venusaur' })).toBeVisible();
    await expect(page.getByRole('link')).toHaveCount(pokemonList.length);
  });

  test('opens a Pokémon detail page with its stats and abilities', async ({
    page,
  }) => {
    await mockPokeApi(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'bulbasaur' }).click();

    await expect(page.locator('.pokemon-name')).toHaveText('bulbasaur');
    await expect(page.locator('.pokemon-page')).toHaveClass(
      /pokemon-type-grass/,
    );
    await expect(page.getByTestId('stats')).toContainText('hp45');
    await expect(page.getByTestId('stats')).toContainText('attack49');
    await expect(page.getByText('overgrow', { exact: true })).toBeVisible();
    await expect(page.getByText('chlorophyll', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Previous' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Next' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });

  test('navigates between Pokémon and back to the list', async ({ page }) => {
    await mockPokeApi(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'ivysaur' }).click();

    await expect(page.locator('.pokemon-name')).toHaveText('ivysaur');
    await page.getByRole('link', { name: 'Previous' }).click();
    await expect(page.locator('.pokemon-name')).toHaveText('bulbasaur');

    await page.getByRole('link', { name: 'Next' }).click();
    await expect(page.locator('.pokemon-name')).toHaveText('ivysaur');
    await page.getByRole('link', { name: 'Next' }).click();
    await expect(page.locator('.pokemon-name')).toHaveText('venusaur');
    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('link', { name: 'bulbasaur' })).toBeVisible();
  });

  test('shows a loading indicator while the list is loading', async ({
    page,
  }) => {
    let finishListRequest;
    const listRequest = new Promise((resolve) => {
      finishListRequest = resolve;
    });

    await page.route(
      /^https:\/\/pokeapi\.co\/api\/v2\/pokemon(?:\/.*)?$/,
      async (route) => {
        await listRequest;
        await route.fulfill({ json: pokemonListResponse });
      },
    );

    const navigation = page.goto('/');
    await expect(page.getByAltText('Loading...')).toBeVisible();
    finishListRequest();
    await navigation;
    await expect(page.getByRole('link', { name: 'bulbasaur' })).toBeVisible();
  });

  test('shows an error when the Pokémon list request fails', async ({
    page,
  }) => {
    await mockPokeApi(page, { failList: true });
    await page.goto('/');

    await expect(page.getByTestId('error')).toContainText('An error occured:');
  });

  test('shows an error when a Pokémon detail request fails', async ({
    page,
  }) => {
    await mockPokeApi(page, { failPokemon: 'bulbasaur' });
    await page.goto('/');
    await page.getByRole('link', { name: 'bulbasaur' }).click();

    await expect(page.getByTestId('error')).toContainText('An error occured:');
  });
});
