import csv
import random
import datetime
from datetime import timedelta

# Set seed for reproducibility
random.seed(42)

# Helper functions
def random_date(start_date, end_date):
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

def add_missing_values(value, missing_rate=0.05):
    return "" if random.random() < missing_rate else value

# File 1: Sales Transaction Data (25,000 rows, 22 columns)
print("Generating sales_data.csv...")
categories = ["Electronics", "Clothing", "Furniture", "Food", "Books", "Sports", "Toys", "Beauty", "Home", "Garden"]
regions = ["North", "South", "East", "West", "Central"]
statuses = ["Delivered", "Shipped", "Pending", "Cancelled", "Returned"]
payment_methods = ["Credit Card", "Debit Card", "PayPal", "Cash", "Bank Transfer"]
customer_segments = ["Premium", "Standard", "Basic", "VIP"]

with open('/home/user/vision-smart-AI/testdata/sales_data.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'transaction_id', 'date', 'customer_id', 'product_id', 'category',
        'region', 'sales_amount', 'quantity', 'discount_percent', 'tax_amount',
        'shipping_cost', 'total_amount', 'status', 'payment_method', 'customer_segment',
        'delivery_days', 'rating', 'is_repeat_customer', 'promotion_applied', 'season',
        'year', 'month'
    ])

    start_date = datetime.date(2020, 1, 1)
    end_date = datetime.date(2024, 12, 31)

    for i in range(1, 25001):
        date = random_date(start_date, end_date)
        sales_amount = round(random.uniform(10, 5000), 2)
        quantity = random.randint(1, 20)
        discount = random.choice([0, 5, 10, 15, 20, 25, 30])
        tax = round(sales_amount * 0.08, 2)
        shipping = round(random.uniform(0, 50), 2)
        total = round(sales_amount - (sales_amount * discount / 100) + tax + shipping, 2)

        # Add some duplicates (2% duplicate rate)
        if random.random() < 0.02 and i > 100:
            transaction_id = random.randint(1, i-1)
        else:
            transaction_id = i

        # Add some outliers in sales_amount
        if random.random() < 0.01:
            sales_amount = round(random.uniform(10000, 50000), 2)
            total = round(sales_amount - (sales_amount * discount / 100) + tax + shipping, 2)

        season = "Winter" if date.month in [12, 1, 2] else "Spring" if date.month in [3, 4, 5] else "Summer" if date.month in [6, 7, 8] else "Fall"

        writer.writerow([
            add_missing_values(transaction_id, 0.001),
            add_missing_values(date.strftime('%Y-%m-%d'), 0.02),
            add_missing_values(random.randint(1, 5000), 0.03),
            add_missing_values(random.randint(1000, 9999), 0.02),
            add_missing_values(random.choice(categories), 0.01),
            add_missing_values(random.choice(regions), 0.01),
            add_missing_values(sales_amount, 0.05),
            add_missing_values(quantity, 0.03),
            add_missing_values(discount, 0.02),
            add_missing_values(tax, 0.04),
            add_missing_values(shipping, 0.03),
            add_missing_values(total, 0.05),
            add_missing_values(random.choice(statuses), 0.02),
            add_missing_values(random.choice(payment_methods), 0.01),
            add_missing_values(random.choice(customer_segments), 0.03),
            add_missing_values(random.randint(1, 30), 0.04),
            add_missing_values(random.randint(1, 5), 0.10),
            add_missing_values(random.choice([True, False]), 0.02),
            add_missing_values(random.choice([True, False]), 0.01),
            add_missing_values(season, 0.01),
            add_missing_values(date.year, 0.01),
            add_missing_values(date.month, 0.01)
        ])

print(f"✓ sales_data.csv created: 25,000 rows, 22 columns")

# File 2: Customer Data (25,000 rows, 21 columns)
print("Generating customer_data.csv...")
countries = ["USA", "Canada", "UK", "Germany", "France", "Australia", "Japan", "Brazil", "India", "China"]
genders = ["Male", "Female", "Other", "Prefer not to say"]
subscription_types = ["Free", "Basic", "Premium", "Enterprise"]
account_statuses = ["Active", "Inactive", "Suspended", "Pending"]

with open('/home/user/vision-smart-AI/testdata/customer_data.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'customer_id', 'first_name', 'last_name', 'email', 'phone',
        'country', 'city', 'age', 'gender', 'signup_date',
        'subscription_type', 'account_status', 'lifetime_value', 'total_orders',
        'average_order_value', 'last_purchase_date', 'loyalty_points', 'is_verified',
        'email_opt_in', 'sms_opt_in', 'referral_count'
    ])

    first_names = ["John", "Emma", "Michael", "Sophia", "William", "Olivia", "James", "Ava", "Robert", "Isabella"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

    for i in range(1, 25001):
        signup = random_date(datetime.date(2018, 1, 1), datetime.date(2024, 12, 31))
        last_purchase = random_date(signup, datetime.date(2024, 12, 31)) if random.random() > 0.1 else None
        total_orders = random.randint(0, 200)
        avg_order = round(random.uniform(20, 500), 2)
        lifetime_value = round(total_orders * avg_order, 2)

        # Add outliers in lifetime_value
        if random.random() < 0.01:
            lifetime_value = round(random.uniform(50000, 200000), 2)

        writer.writerow([
            add_missing_values(i, 0.001),
            add_missing_values(random.choice(first_names), 0.02),
            add_missing_values(random.choice(last_names), 0.02),
            add_missing_values(f"{random.choice(first_names).lower()}.{random.choice(last_names).lower()}@example.com", 0.03),
            add_missing_values(f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}", 0.08),
            add_missing_values(random.choice(countries), 0.02),
            add_missing_values(f"City_{random.randint(1, 100)}", 0.03),
            add_missing_values(random.randint(18, 80), 0.05),
            add_missing_values(random.choice(genders), 0.06),
            add_missing_values(signup.strftime('%Y-%m-%d'), 0.01),
            add_missing_values(random.choice(subscription_types), 0.02),
            add_missing_values(random.choice(account_statuses), 0.01),
            add_missing_values(lifetime_value, 0.04),
            add_missing_values(total_orders, 0.03),
            add_missing_values(avg_order, 0.04),
            add_missing_values(last_purchase.strftime('%Y-%m-%d') if last_purchase else "", 0.15),
            add_missing_values(random.randint(0, 10000), 0.05),
            add_missing_values(random.choice([True, False]), 0.02),
            add_missing_values(random.choice([True, False]), 0.03),
            add_missing_values(random.choice([True, False]), 0.04),
            add_missing_values(random.randint(0, 50), 0.05)
        ])

print(f"✓ customer_data.csv created: 25,000 rows, 21 columns")

# File 3: Product Catalog (25,000 rows, 23 columns)
print("Generating product_data.csv...")
brands = ["BrandA", "BrandB", "BrandC", "BrandD", "BrandE", "BrandF", "BrandG", "BrandH"]
suppliers = ["Supplier1", "Supplier2", "Supplier3", "Supplier4", "Supplier5"]
warehouses = ["WH-North", "WH-South", "WH-East", "WH-West", "WH-Central"]
product_statuses = ["Active", "Discontinued", "Out of Stock", "Limited Stock"]

with open('/home/user/vision-smart-AI/testdata/product_data.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'product_id', 'product_name', 'category', 'subcategory', 'brand',
        'supplier', 'cost_price', 'selling_price', 'profit_margin', 'stock_quantity',
        'reorder_level', 'warehouse_location', 'weight_kg', 'dimensions_cm',
        'color', 'size', 'material', 'rating_average', 'review_count',
        'launch_date', 'status', 'is_featured', 'warranty_months'
    ])

    colors = ["Red", "Blue", "Green", "Black", "White", "Silver", "Gold", "Pink", "Purple", "Orange"]
    sizes = ["XS", "S", "M", "L", "XL", "XXL", "One Size"]
    materials = ["Cotton", "Plastic", "Metal", "Wood", "Glass", "Leather", "Synthetic", "Mixed"]
    subcategories = {
        "Electronics": ["Phones", "Laptops", "Tablets", "Cameras"],
        "Clothing": ["Shirts", "Pants", "Dresses", "Shoes"],
        "Furniture": ["Chairs", "Tables", "Sofas", "Beds"],
        "Food": ["Snacks", "Beverages", "Frozen", "Fresh"],
        "Books": ["Fiction", "Non-Fiction", "Educational", "Comics"]
    }

    for i in range(1000, 26000):
        category = random.choice(categories)
        subcategory_list = subcategories.get(category, ["General"])
        cost = round(random.uniform(5, 500), 2)
        selling = round(cost * random.uniform(1.2, 3.0), 2)
        margin = round(((selling - cost) / selling) * 100, 2)

        # Add outliers
        if random.random() < 0.01:
            selling = round(random.uniform(5000, 20000), 2)
            margin = round(((selling - cost) / selling) * 100, 2)

        launch = random_date(datetime.date(2015, 1, 1), datetime.date(2024, 12, 31))

        writer.writerow([
            add_missing_values(i, 0.001),
            add_missing_values(f"Product_{category}_{i}", 0.02),
            add_missing_values(category, 0.01),
            add_missing_values(random.choice(subcategory_list), 0.02),
            add_missing_values(random.choice(brands), 0.02),
            add_missing_values(random.choice(suppliers), 0.03),
            add_missing_values(cost, 0.04),
            add_missing_values(selling, 0.04),
            add_missing_values(margin, 0.05),
            add_missing_values(random.randint(0, 1000), 0.03),
            add_missing_values(random.randint(10, 100), 0.04),
            add_missing_values(random.choice(warehouses), 0.03),
            add_missing_values(round(random.uniform(0.1, 50), 2), 0.05),
            add_missing_values(f"{random.randint(5,100)}x{random.randint(5,100)}x{random.randint(5,100)}", 0.06),
            add_missing_values(random.choice(colors), 0.05),
            add_missing_values(random.choice(sizes), 0.07),
            add_missing_values(random.choice(materials), 0.04),
            add_missing_values(round(random.uniform(1.0, 5.0), 1), 0.08),
            add_missing_values(random.randint(0, 5000), 0.07),
            add_missing_values(launch.strftime('%Y-%m-%d'), 0.03),
            add_missing_values(random.choice(product_statuses), 0.02),
            add_missing_values(random.choice([True, False]), 0.02),
            add_missing_values(random.choice([0, 6, 12, 24, 36]), 0.05)
        ])

print(f"✓ product_data.csv created: 25,000 rows, 23 columns")

# File 4: Marketing Campaigns (25,000 rows, 24 columns)
print("Generating marketing_campaigns.csv...")
channels = ["Email", "Social Media", "Google Ads", "TV", "Radio", "Billboard", "Influencer", "Direct Mail"]
campaign_types = ["Awareness", "Conversion", "Retention", "Launch", "Seasonal"]
target_audiences = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
ad_formats = ["Image", "Video", "Carousel", "Story", "Text", "Interactive"]
objectives = ["Traffic", "Sales", "Leads", "Engagement", "Brand Awareness"]

with open('/home/user/vision-smart-AI/testdata/marketing_campaigns.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'campaign_id', 'campaign_name', 'start_date', 'end_date', 'channel',
        'campaign_type', 'target_audience', 'ad_format', 'objective', 'budget',
        'spend', 'impressions', 'clicks', 'conversions', 'ctr_percent',
        'conversion_rate_percent', 'cost_per_click', 'cost_per_conversion', 'revenue_generated',
        'roi_percent', 'region', 'is_active', 'a_b_test_variant', 'engagement_score'
    ])

    for i in range(1, 25001):
        start = random_date(datetime.date(2020, 1, 1), datetime.date(2024, 11, 30))
        duration = random.randint(7, 90)
        end = start + timedelta(days=duration)

        budget = round(random.uniform(1000, 100000), 2)
        spend = round(budget * random.uniform(0.5, 1.1), 2)
        impressions = random.randint(1000, 1000000)
        clicks = random.randint(10, int(impressions * 0.1))
        conversions = random.randint(0, int(clicks * 0.2))
        ctr = round((clicks / impressions * 100), 2) if impressions > 0 else 0
        conv_rate = round((conversions / clicks * 100), 2) if clicks > 0 else 0
        cpc = round(spend / clicks, 2) if clicks > 0 else 0
        cpa = round(spend / conversions, 2) if conversions > 0 else 0
        revenue = round(conversions * random.uniform(50, 500), 2)
        roi = round(((revenue - spend) / spend * 100), 2) if spend > 0 else 0

        # Add outliers
        if random.random() < 0.01:
            budget = round(random.uniform(500000, 2000000), 2)
            spend = round(budget * random.uniform(0.8, 1.0), 2)
            revenue = round(spend * random.uniform(2, 10), 2)
            roi = round(((revenue - spend) / spend * 100), 2)

        writer.writerow([
            add_missing_values(f"CMP{i:05d}", 0.001),
            add_missing_values(f"Campaign_{random.choice(campaign_types)}_{i}", 0.02),
            add_missing_values(start.strftime('%Y-%m-%d'), 0.01),
            add_missing_values(end.strftime('%Y-%m-%d'), 0.02),
            add_missing_values(random.choice(channels), 0.01),
            add_missing_values(random.choice(campaign_types), 0.01),
            add_missing_values(random.choice(target_audiences), 0.03),
            add_missing_values(random.choice(ad_formats), 0.02),
            add_missing_values(random.choice(objectives), 0.02),
            add_missing_values(budget, 0.03),
            add_missing_values(spend, 0.04),
            add_missing_values(impressions, 0.05),
            add_missing_values(clicks, 0.05),
            add_missing_values(conversions, 0.06),
            add_missing_values(ctr, 0.06),
            add_missing_values(conv_rate, 0.07),
            add_missing_values(cpc, 0.06),
            add_missing_values(cpa, 0.08),
            add_missing_values(revenue, 0.05),
            add_missing_values(roi, 0.06),
            add_missing_values(random.choice(regions), 0.02),
            add_missing_values(random.choice([True, False]), 0.02),
            add_missing_values(random.choice(["A", "B", "Control", None]), 0.20),
            add_missing_values(round(random.uniform(0, 100), 1), 0.07)
        ])

print(f"✓ marketing_campaigns.csv created: 25,000 rows, 24 columns")

print("\n" + "="*60)
print("ALL TEST FILES GENERATED SUCCESSFULLY!")
print("="*60)
print("\nSummary:")
print("1. sales_data.csv - 25,000 rows x 22 columns (Transaction data)")
print("2. customer_data.csv - 25,000 rows x 21 columns (Customer profiles)")
print("3. product_data.csv - 25,000 rows x 23 columns (Product catalog)")
print("4. marketing_campaigns.csv - 25,000 rows x 24 columns (Campaign analytics)")
print("\nFeatures included:")
print("✓ Multiple data types (numeric, string, boolean, date)")
print("✓ Missing values (1-20% per column)")
print("✓ Duplicates (~2% in sales_data)")
print("✓ Outliers (~1% in key numeric columns)")
print("✓ Join keys (customer_id, product_id)")
print("✓ Time series data (dates for forecasting)")
print("✓ Categorical data (for filtering and grouping)")
print("✓ Numeric data (for regression and ML models)")
print("\nLocation: /home/user/vision-smart-AI/testdata/")
print("="*60)
