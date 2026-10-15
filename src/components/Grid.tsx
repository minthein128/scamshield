import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface GridProps {
  columns: number;
  gap?: number;
  children: React.ReactNode;
}

/** Equal-width card grid. Rows stretch to the tallest card; a short last row keeps its column width. */
export const Grid: React.FC<GridProps> = ({ columns, gap = 12, children }) => {
  const items = React.Children.toArray(children).map(child =>
    React.isValidElement<{ style?: StyleProp<ViewStyle> }>(child) ? React.cloneElement(child, { style: [child.props.style, styles.fill] }) : child,
  );
  if (columns <= 1) return <View style={{ gap }}>{items}</View>;
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={styles.cell}>{row[c] ?? null}</View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  fill: { flexGrow: 1 },
  cell: { flex: 1, flexBasis: 0, minWidth: 0 },
});
