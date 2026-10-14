import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReduceMotion } from '../../components/ShieldLoader';
import theme from '../../theme/theme';
import { DEMOS, DEMO_SIZE } from '../demo/registry';
import { STEPPER_BACK, STEPPER_DONE, STEPPER_NEXT, type DemoKey } from './content';

const { colors, fonts } = theme;
const MAX_FRAME = 280;

export interface StepperStep {
  demo: DemoKey;
  title: string;
  caption: string;
}

interface Props {
  steps: StepperStep[];
  accent?: string;
  onDone?: () => void;
  testID?: string;
}

const Frame: React.FC<{ demo: DemoKey; width: number; label: string }> = ({ demo, width, label }) => {
  const Demo = DEMOS[demo];
  const scale = width / DEMO_SIZE.width;
  const height = Math.round(DEMO_SIZE.height * scale);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.frame, { width, height }]}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute', left: 0, top: 0, width: DEMO_SIZE.width, height: DEMO_SIZE.height,
          transform: [{ translateX: -(DEMO_SIZE.width - width) / 2 }, { translateY: -(DEMO_SIZE.height - height) / 2 }, { scale }],
        }}
      >
        <Demo />
      </View>
    </View>
  );
};

export const DemoStepper: React.FC<Props> = ({ steps, accent = colors.accent, onDone, testID }) => {
  const reduceMotion = useReduceMotion();
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const last = steps.length - 1;
  const frameWidth = Math.min(MAX_FRAME, Math.max(0, width - 32));

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(last, next)));
  };
  const goTo = useCallback((i: number) => {
    const target = Math.max(0, Math.min(last, i));
    setIndex(target);
    scroller.current?.scrollTo({ x: target * width, animated: !reduceMotion });
  }, [last, width, reduceMotion]);

  const atEnd = index === last;
  const step = steps[index];
  const nextLabel = atEnd && onDone ? STEPPER_DONE : STEPPER_NEXT;
  const nextDisabled = atEnd && !onDone;

  return (
    <View testID={testID} style={styles.root} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          accessibilityLabel={`Example, ${steps.length} steps. Swipe or use Next and Back.`}
        >
          {steps.map((s, i) => (
            <View key={s.demo + i} style={[styles.page, { width }]}>
              <Text style={styles.title}>{`${i + 1}. ${s.title}`}</Text>
              <Text style={styles.caption}>{s.caption}</Text>
              <Frame demo={s.demo} width={frameWidth} label={`Example screen for step ${i + 1}: ${s.title}`} />
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View accessibilityRole="progressbar" accessibilityLabel={`Step ${index + 1} of ${steps.length}: ${step?.title ?? ''}`} accessibilityLiveRegion="polite" style={styles.dots}>
        {steps.map((s, i) => (
          <View key={s.demo + i} style={[styles.dot, i === index && { backgroundColor: accent, width: 22 }]} />
        ))}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          testID="stepper-back"
          accessibilityRole="button"
          accessibilityLabel={`${STEPPER_BACK}, to step ${index} of ${steps.length}`}
          accessibilityState={{ disabled: index === 0 }}
          disabled={index === 0}
          activeOpacity={0.7}
          onPress={() => goTo(index - 1)}
          style={[styles.btn, styles.btnBack, index === 0 && styles.off]}
        >
          <Text style={[styles.btnText, { color: colors.textPrimary }]}>{STEPPER_BACK}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="stepper-next"
          accessibilityRole="button"
          accessibilityLabel={atEnd ? nextLabel : `${STEPPER_NEXT}, to step ${index + 2} of ${steps.length}`}
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
          activeOpacity={0.7}
          onPress={() => (atEnd ? onDone?.() : goTo(index + 1))}
          style={[styles.btn, { backgroundColor: accent }, nextDisabled && styles.off]}
        >
          <Text style={[styles.btnText, { color: colors.white }]}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 12 },
  page: { alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  title: { alignSelf: 'stretch', color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold },
  caption: { alignSelf: 'stretch', color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, marginBottom: 6 },
  frame: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderLight },
  controls: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnBack: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight },
  btnText: { fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  off: { opacity: 0.4 },
});

export default DemoStepper;
