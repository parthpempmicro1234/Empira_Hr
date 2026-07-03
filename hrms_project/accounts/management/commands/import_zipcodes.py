import json
from django.core.management.base import BaseCommand
from accounts.models import Country, State, City, Zipcode


class Command(BaseCommand):
    help = "Import zipcode data from JSON"

    def handle(self, *args, **kwargs):
        file_path = "data.json"

        # 🔥 FIX: utf-8-sig
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)

        records = data.get('Sheet1', [])

        try:
            country = Country.objects.get(id=1)
        except Country.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ India (id=1) not found"))
            return

        created_count = 0

        for item in records:
            state_name = item.get('State')
            city_name = item.get('City')
            district = item.get('District')
            pincode = item.get('Pincode')

            # skip invalid
            if not (state_name and city_name and pincode):
                continue

            # normalize
            state_name = state_name.strip().title()
            city_name = city_name.strip().title()

            # =========================
            # STATE (create if not exists)
            # =========================
            state, _ = State.objects.get_or_create(
                name=state_name,
                country=country
            )

            # =========================
            # CITY (create if not exists)
            # =========================
            city, _ = City.objects.get_or_create(
                name=city_name,
                state=state
            )

            # =========================
            # ZIPCODE
            # =========================
            obj, created = Zipcode.objects.get_or_create(
                code=pincode,
                city=city,
                district=district
            )

            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"✅ Imported {created_count} new zipcodes"
        ))