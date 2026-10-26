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

function mockPokeApi({ failList = false, failPokemon } = {}) {
  cy.intercept(
    'GET',
    /^https:\/\/pokeapi\.co\/api\/v2\/pokemon(?:\/.*)?$/,
    (request) => {
      const url = new URL(request.url);
      const name = url.pathname.split('/').filter(Boolean).pop();

      if (url.searchParams.has('limit')) {
        if (failList) {
          request.reply({ statusCode: 500, body: 'List request failed' });
          return;
        }
        request.reply({ body: pokemonListResponse });
        return;
      }

      if (name === failPokemon) {
        request.reply({ statusCode: 500, body: 'Pokemon request failed' });
        return;
      }

      const pokemon = pokemonDetails[name];
      if (!pokemon) {
        request.reply({ statusCode: 404, body: 'Pokemon not found' });
        return;
      }
      request.reply({ body: pokemon });
    },
  );
}

describe('Pokedex', function () {
  it('front page can be opened', function () {
    cy.visit('/');
    cy.contains('ivysaur').should('be.visible');
    cy.contains(
      'Pokémon and Pokémon character names are trademarks of Nintendo.',
    ).should('be.visible');
  });

  it('shows the Pokémon list', function () {
    mockPokeApi();
    cy.visit('/');

    cy.contains('a', 'bulbasaur').should('be.visible');
    cy.contains('a', 'ivysaur').should('be.visible');
    cy.contains('a', 'venusaur').should('be.visible');
    cy.get('a').should('have.length', pokemonList.length);
  });

  it('opens a Pokémon detail page with its stats and abilities', function () {
    mockPokeApi();
    cy.visit('/');
    cy.contains('a', 'bulbasaur').click();

    cy.get('.pokemon-name').should('have.text', 'bulbasaur');
    cy.get('.pokemon-page').should('have.class', 'pokemon-type-grass');
    cy.get('[data-testid="stats"]').should('contain.text', 'hp45');
    cy.get('[data-testid="stats"]').should('contain.text', 'attack49');
    cy.contains('overgrow').should('be.visible');
    cy.contains('chlorophyll').should('be.visible');
    cy.contains('a', 'Previous').should('not.exist');
    cy.contains('a', 'Next').should('be.visible');
    cy.contains('a', 'Home').should('be.visible');
  });

  it('navigates between Pokémon and back to the list', function () {
    mockPokeApi();
    cy.visit('/');
    cy.contains('a', 'ivysaur').click();

    cy.get('.pokemon-name').should('have.text', 'ivysaur');
    cy.contains('a', 'Previous').click();
    cy.get('.pokemon-name').should('have.text', 'bulbasaur');

    cy.contains('a', 'Next').click();
    cy.get('.pokemon-name').should('have.text', 'ivysaur');
    cy.contains('a', 'Next').click();
    cy.get('.pokemon-name').should('have.text', 'venusaur');
    cy.contains('a', 'Next').should('not.exist');

    cy.contains('a', 'Home').click();
    cy.contains('a', 'bulbasaur').should('be.visible');
  });

  it('shows a loading indicator while the list is loading', function () {
    let finishListRequest;
    const listRequest = new Cypress.Promise((resolve) => {
      finishListRequest = resolve;
    });

    cy.intercept(
      'GET',
      /^https:\/\/pokeapi\.co\/api\/v2\/pokemon(?:\/.*)?$/,
      (request) =>
        listRequest.then(() => request.reply({ body: pokemonListResponse })),
    );

    cy.visit('/');
    cy.get('img[alt="Loading..."]').should('be.visible');
    cy.then(() => finishListRequest());
    cy.contains('a', 'bulbasaur').should('be.visible');
  });

  it('shows an error when the Pokémon list request fails', function () {
    mockPokeApi({ failList: true });
    cy.visit('/');

    cy.get('[data-testid="error"]').should(
      'contain.text',
      'An error occured:',
    );
  });

  it('shows an error when a Pokémon detail request fails', function () {
    mockPokeApi({ failPokemon: 'bulbasaur' });
    cy.visit('/');
    cy.contains('a', 'bulbasaur').click();

    cy.get('[data-testid="error"]').should(
      'contain.text',
      'An error occured:',
    );
  });
});
