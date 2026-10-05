import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../app/index';

describe('HomeScreen', () => {
  it('renders CineTickets title and subtitle correctly', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('CineTickets')).toBeTruthy();
    expect(getByText('Tu app para comprar entradas de cine al instante.')).toBeTruthy();
  });
});
