import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MovieCard } from '../src/features/movies/components/MovieCard';
import { FilterChips } from '../src/features/movies/components/FilterChips';
import { SearchBar } from '../src/features/movies/components/SearchBar';
import { ShowtimeSelector } from '../src/features/movies/components/ShowtimeSelector';
import { Movie, CinemaShowtimesGroup, Showtime } from '@cinetickets/shared';

describe('Movie Components', () => {
  const mockMovie: Movie = {
    id: 'm-1',
    title: 'Inception Test',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
    synopsis: 'Un ladrón que roba secretos corporativos a través del sueño.',
    genres: ['Ciencia Ficción', 'Acción'],
    durationMin: 148,
    rating: 'PG-13',
    language: 'Inglés',
    subtitles: ['Español'],
    releaseDate: '2026-05-10',
    posterUrl: 'https://example.com/poster.jpg',
    score: 8.8,
    country: 'Estados Unidos',
    year: 2026,
  };

  describe('MovieCard', () => {
    it('renders movie title, score, genres and duration correctly', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(<MovieCard movie={mockMovie} onPress={onPressMock} />);

      expect(getByText('Inception Test')).toBeTruthy();
      expect(getByText('★ 8.8')).toBeTruthy();
      expect(getByText('Ciencia Ficción • Acción')).toBeTruthy();
      expect(getByText('148 min')).toBeTruthy();
      expect(getByText('PG-13')).toBeTruthy();
    });

    it('triggers onPress callback when clicked', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(<MovieCard movie={mockMovie} onPress={onPressMock} />);

      fireEvent.press(getByText('Inception Test'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('FilterChips', () => {
    it('renders list of filter options and highlights selected one', () => {
      const onSelectMock = jest.fn();
      const options = ['Todos', 'Acción', 'Comedia'];
      const { getByText } = render(
        <FilterChips
          label="Géneros"
          options={options}
          selectedOption="Acción"
          onSelect={onSelectMock}
        />,
      );

      expect(getByText('Géneros')).toBeTruthy();
      expect(getByText('Todos')).toBeTruthy();
      expect(getByText('Acción')).toBeTruthy();
      expect(getByText('Comedia')).toBeTruthy();

      fireEvent.press(getByText('Comedia'));
      expect(onSelectMock).toHaveBeenCalledWith('Comedia');
    });
  });

  describe('SearchBar', () => {
    it('renders input, handles typing and allows clearing', () => {
      const onChangeMock = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <SearchBar value="Matrix" onChangeText={onChangeMock} />,
      );

      const input = getByPlaceholderText('Buscar película, director o actor...');
      expect(input.props.value).toBe('Matrix');

      fireEvent.changeText(input, 'Avatar');
      expect(onChangeMock).toHaveBeenCalledWith('Avatar');

      // Click botón limpiar ✕
      const clearBtn = getByText('✕');
      fireEvent.press(clearBtn);
      expect(onChangeMock).toHaveBeenCalledWith('');
    });
  });

  describe('ShowtimeSelector', () => {
    const mockShowtime: Showtime = {
      id: 'st-1',
      movieId: 'm-1',
      hallId: 'h-1',
      startsAt: '2026-10-06T18:00:00.000Z',
      language: 'Subtitulada',
      format: 'IMAX',
      priceStandardCents: 600000,
      priceVipCents: 850000,
      priceAccessibleCents: 500000,
    };

    const mockCinemaGroups: CinemaShowtimesGroup[] = [
      {
        cinema: {
          id: 'c-1',
          name: 'Cine Grand Plaza',
          address: 'Av. Libertador 4500',
          city: 'Buenos Aires',
          timezone: 'America/Argentina/Buenos_Aires',
          amenities: ['IMAX Láser', 'Dolby Atmos'],
        },
        showtimes: [mockShowtime],
      },
    ];

    const availableDates = [
      { label: 'Hoy', dateStr: '2026-10-06' },
      { label: 'Mié 7 Oct', dateStr: '2026-10-07' },
    ];

    it('renders cinema information, amenities and showtime buttons with prices', () => {
      const onSelectDateMock = jest.fn();
      const onSelectShowtimeMock = jest.fn();

      const { getByText } = render(
        <ShowtimeSelector
          cinemaGroups={mockCinemaGroups}
          selectedDate="2026-10-06"
          onSelectDate={onSelectDateMock}
          onSelectShowtime={onSelectShowtimeMock}
          availableDates={availableDates}
        />,
      );

      expect(getByText('Funciones y Horarios')).toBeTruthy();
      expect(getByText('Hoy')).toBeTruthy();
      expect(getByText('Mié 7 Oct')).toBeTruthy();
      expect(getByText('Cine Grand Plaza')).toBeTruthy();
      expect(getByText('IMAX Láser')).toBeTruthy();
      expect(getByText('18:00')).toBeTruthy();
      expect(getByText('IMAX')).toBeTruthy();
      expect(getByText('Subtitulada')).toBeTruthy();
      expect(getByText('$6.000')).toBeTruthy();
      expect(getByText('$8.500')).toBeTruthy();

      // Press showtime button
      fireEvent.press(getByText('18:00'));
      expect(onSelectShowtimeMock).toHaveBeenCalledWith(mockShowtime);

      // Press another date
      fireEvent.press(getByText('Mié 7 Oct'));
      expect(onSelectDateMock).toHaveBeenCalledWith('2026-10-07');
    });

    it('renders empty message when no showtimes are found for the date', () => {
      const { getByText } = render(
        <ShowtimeSelector
          cinemaGroups={[]}
          selectedDate="2026-10-06"
          onSelectDate={jest.fn()}
          onSelectShowtime={jest.fn()}
          availableDates={availableDates}
        />,
      );

      expect(getByText('No hay funciones disponibles para esta fecha.')).toBeTruthy();
    });
  });
});
