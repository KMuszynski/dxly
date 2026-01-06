"use client";

import { useTranslation } from "react-i18next";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { BrainIcon, HeartIcon, LockIcon, ZapIcon } from "lucide-react";

export function FeaturesCarousel() {
  const { t } = useTranslation("common");

  const features = [
    {
      icon: <ZapIcon className="w-10 h-10" />,
      title: t("features.1.title"),
      description: t("features.1.description"),
    },
    {
      icon: <BrainIcon className="w-10 h-10" />,
      title: t("features.2.title"),
      description: t("features.2.description"),
    },
    {
      icon: <HeartIcon className="w-10 h-10" />,
      title: t("features.3.title"),
      description: t("features.3.description"),
    },
    {
      icon: <LockIcon className="w-10 h-10" />,
      title: t("features.4.title"),
      description: t("features.4.description"),
    },
  ];

  return (
    <Carousel className="w-full max-w-4xl mx-auto">
      <CarouselContent>
        {features.map((feature, index) => (
          <CarouselItem key={index} className="md:basis-1/3 basis-1/2">
            <div className="p-1 h-full">
              <Card className="bg-black/10 backdrop-blur-md border-solid border-2 border-white/10 h-full">
                <CardContent className="flex aspect-square items-center justify-center p-6 ">
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="text-4xl mr-4 flex-shrink-0 mb-4 text-gray-200">
                      {feature.icon}
                    </div>
                    <p className="text-xl font-bold text-gray-200 text-center mb-2">
                      {feature.title}
                    </p>
                    <p className="text-lg text-gray-300 text-center">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
