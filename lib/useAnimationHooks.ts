import { useIntersectionObserver } from "./useIntersectionObserver";

export function useAnimationHooks() {
  const threshold = 0.2;
  
  return {
    heroTitleRef: useIntersectionObserver<HTMLHeadingElement>({ threshold }),
    heroSubtitleRef: useIntersectionObserver<HTMLParagraphElement>({ threshold }),
    featuresTitleRef: useIntersectionObserver<HTMLHeadingElement>({ threshold }),
    infoTitleRef: useIntersectionObserver<HTMLHeadingElement>({ threshold }),
    infoSubtitleRef: useIntersectionObserver<HTMLParagraphElement>({ threshold }),
    ctaTitleRef: useIntersectionObserver<HTMLHeadingElement>({ threshold }),
    ctaSubtitleRef: useIntersectionObserver<HTMLParagraphElement>({ threshold }),
    contactTitleRef: useIntersectionObserver<HTMLHeadingElement>({ threshold }),
    contactSubtitleRef: useIntersectionObserver<HTMLParagraphElement>({ threshold }),
  };
}
