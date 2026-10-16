import { prepareImage, widthsFor } from '../lib/image';

describe('screenshot width', () => {
  it('starts at the overlay width and never upscales', () => {
    expect(widthsFor()).toEqual([1080, 900, 720, 540]);
    expect(widthsFor(1440)).toEqual([1080, 900, 720, 540]);
    expect(widthsFor(1080)).toEqual([1080, 900, 720, 540]);
    expect(widthsFor(800)).toEqual([800, 720, 540]);
  });

  it('asks the manipulator for the first width that fits the source', async () => {
    const widths: number[] = [];
    await prepareImage(
      'in',
      1000,
      async (_u, width) => {
        widths.push(width);
        return { uri: 'o', base64: 'A'.repeat(100) };
      },
      800
    );
    expect(widths).toEqual([800]);
  });
});
